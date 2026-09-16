import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BOSS_QUEST_TARGET_SESSIONS,
  COIN_REWARDS,
  XP_REWARDS,
  detectLevelUp,
  statPointsForLevelsGained,
  computeStreakAfterCompletion,
  isBossQuestComplete,
} from "@risesolo/domain";
import type {
  CompleteWorkoutResponse,
  LogSetRequest,
  StartWorkoutSessionRequest,
  WorkoutSessionDto,
} from "@risesolo/validation";
import type { WorkoutSession } from "@prisma/client";
import { diffInUtcDays, startOfUtcDay } from "../common/date";
// PrismaService/QuestsService/GuildsService MORAJU biti value import (ne
// "import type") - NestJS DI se oslanja na emitDecoratorMetadata koji
// zahteva stvarnu klasu u constructor parametar tipu, ne obrisanu type-only
// referencu.
import { GuildsService } from "../guilds/guilds.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { QuestsService } from "../quests/quests.service";

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questsService: QuestsService,
    private readonly guildsService: GuildsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async startSession(userId: string, dto: StartWorkoutSessionRequest): Promise<WorkoutSessionDto> {
    if (dto.workoutId) {
      const workout = await this.prisma.workout.findUnique({ where: { id: dto.workoutId } });
      if (!workout || workout.userId !== userId) {
        throw new NotFoundException("Workout template nije pronadjen");
      }
    }

    const session = await this.prisma.workoutSession.create({
      data: { userId, workoutId: dto.workoutId ?? null },
    });
    return toSessionDto(session);
  }

  async logSet(userId: string, sessionId: string, dto: LogSetRequest): Promise<void> {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const exercise = await this.prisma.exercise.findUnique({ where: { id: dto.exerciseId } });
    if (!exercise) {
      throw new NotFoundException("Vezba nije pronadjena");
    }

    await this.prisma.workoutSet.upsert({
      where: {
        sessionId_exerciseId_setNumber: {
          sessionId: session.id,
          exerciseId: dto.exerciseId,
          setNumber: dto.setNumber,
        },
      },
      create: {
        sessionId: session.id,
        exerciseId: dto.exerciseId,
        setNumber: dto.setNumber,
        reps: dto.reps ?? null,
        weightKg: dto.weightKg ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        completed: dto.completed,
      },
      update: {
        reps: dto.reps ?? null,
        weightKg: dto.weightKg ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        completed: dto.completed,
      },
    });
  }

  /**
   * Completion engine - JEDINO mesto gde XP/level/coins/stat-points/streak
   * nastaju. Klijent nikad ne salje "xp: 150"; server racuna sve na osnovu
   * poslovnih pravila iz @risesolo/domain i perzistira ih atomicno.
   *
   * Pipeline: validate -> XP event (idempotentno preko unique constraint) ->
   * daily quest -> boss quest -> level-up check -> stat points -> coins ->
   * streak -> DTO.
   */
  async completeSession(userId: string, sessionId: string): Promise<CompleteWorkoutResponse> {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const completedSetsCount = await this.prisma.workoutSet.count({
      where: { sessionId: session.id, completed: true },
    });
    if (completedSetsCount === 0) {
      throw new BadRequestException("Trening mora imati bar jednu zavrsenu seriju da bi bio zavrsen");
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.workoutSession.update({
          where: { id: session.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        const progressionBefore = await tx.progression.findUniqueOrThrow({ where: { userId } });
        const totalXpBefore = progressionBefore.totalXp;

        // Uvek nagradjujemo workout completion.
        await tx.xpEvent.create({
          data: { userId, source: "WORKOUT_COMPLETE", sourceId: session.id, amount: XP_REWARDS.WORKOUT_COMPLETE },
        });
        let xpGained = XP_REWARDS.WORKOUT_COMPLETE;
        let coinsGained = COIN_REWARDS.WORKOUT_COMPLETE;

        // Danasnji quest se automatski zavrsava prvim zavrsenim treningom u danu (ako vec nije).
        const today = new Date();
        const quest = await this.questsService.generateDailyQuest(userId, today, tx);
        const completedQuest = await this.questsService.completeQuestIfPending(quest.id, tx);
        const questCompleted = completedQuest !== null;
        if (questCompleted) {
          await tx.xpEvent.create({
            data: { userId, source: "DAILY_QUEST_COMPLETE", sourceId: quest.id, amount: quest.xpReward },
          });
          xpGained += quest.xpReward;
          coinsGained += quest.coinReward;
        }

        // Boss quest se zavrsava kada broj zavrsenih sesija ove ISO nedelje (uklj. ovu, jer je
        // session update vec izvrsen iznad u istoj transakciji) dostigne cilj.
        const bossQuest = await this.questsService.generateBossQuest(userId, today, tx);
        let bossQuestCompleted = false;
        if (bossQuest.status !== "COMPLETED" && bossQuest.status !== "EXPIRED") {
          const completedSessionsThisWeek = await this.questsService.countCompletedSessionsThisWeek(userId, today, tx);
          if (isBossQuestComplete(completedSessionsThisWeek, bossQuest.targetSets ?? BOSS_QUEST_TARGET_SESSIONS)) {
            const completedBossQuest = await this.questsService.completeQuestIfPending(bossQuest.id, tx);
            bossQuestCompleted = completedBossQuest !== null;
            if (bossQuestCompleted) {
              await tx.xpEvent.create({
                data: { userId, source: "BOSS_QUEST_COMPLETE", sourceId: bossQuest.id, amount: bossQuest.xpReward },
              });
              xpGained += bossQuest.xpReward;
              coinsGained += bossQuest.coinReward;
            }
          }
        }

        // Cehovski doprinos i raid provera - ako korisnik nije u cehu, nema efekta
        // (vidi GuildsService.contributeWorkoutXp).
        const { guildXpContributed, guildRaidCompleted } = await this.guildsService.contributeWorkoutXp(
          userId,
          xpGained,
          today,
          tx,
        );

        const levelUpResult = detectLevelUp(totalXpBefore, xpGained);
        const statPointsGained = statPointsForLevelsGained(levelUpResult.levelsGained);

        const daysSinceLastCompletion = progressionBefore.lastActivityDate
          ? diffInUtcDays(today, progressionBefore.lastActivityDate)
          : null;
        const newStreak = computeStreakAfterCompletion(progressionBefore.currentStreak, daysSinceLastCompletion);

        const progressionAfter = await tx.progression.update({
          where: { userId },
          data: {
            totalXp: { increment: xpGained },
            coins: { increment: coinsGained },
            currentStreak: newStreak,
            lastActivityDate: startOfUtcDay(today),
          },
        });

        if (statPointsGained > 0) {
          await tx.playerStats.update({
            where: { userId },
            data: { statPoints: { increment: statPointsGained } },
          });
        }

        return {
          success: true as const,
          xpGained,
          totalXp: progressionAfter.totalXp,
          level: levelUpResult.newLevel,
          levelUp: levelUpResult.leveledUp,
          statPointsGained,
          coinsGained,
          coins: progressionAfter.coins,
          questCompleted,
          bossQuestCompleted,
          streak: newStreak,
          guildXpContributed,
          guildRaidCompleted,
        };
      });

      // Push notifikacije se salju POSLE zavrsene transakcije (nikad unutar
      // nje - mrezni poziv ka Expo servisu ne sme da drzi DB transakciju
      // otvorenu niti da izazove rollback XP-a ako slanje ne uspe).
      if (result.bossQuestCompleted) {
        this.notificationsService
          .sendToUser(userId, {
            title: "Boss Quest pobedjen!",
            body: "Osvojio si veliku nedeljnu nagradu.",
            data: { screen: "/home" },
          })
          .catch(() => undefined);
      }
      if (result.guildRaidCompleted) {
        this.guildsService.sendRaidCompletionNotification(userId).catch(() => undefined);
      }

      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Session je vec bio zavrsen u paralelnom zahtevu (retry/dupli tap) - nema duple nagrade.
        throw new ConflictException("Trening je vec zavrsen");
      }
      throw error;
    }
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string): Promise<WorkoutSession> {
    const session = await this.prisma.workoutSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Workout sesija nije pronadjena");
    }
    if (session.status !== "IN_PROGRESS") {
      throw new BadRequestException(`Sesija je vec u stanju ${session.status}`);
    }
    return session;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function toSessionDto(session: WorkoutSession): WorkoutSessionDto {
  return {
    id: session.id,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
  };
}
