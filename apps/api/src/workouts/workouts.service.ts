import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  COIN_REWARDS,
  XP_REWARDS,
  detectLevelUp,
  statPointsForLevelsGained,
  computeStreakAfterCompletion,
} from "@risesolo/domain";
import type {
  CompleteWorkoutResponse,
  LogSetRequest,
  StartWorkoutSessionRequest,
  WorkoutSessionDto,
} from "@risesolo/validation";
import type { WorkoutSession } from "@prisma/client";
import { diffInUtcDays, startOfUtcDay } from "../common/date";
// PrismaService/QuestsService MORAJU biti value import (ne "import type") -
// NestJS DI se oslanja na emitDecoratorMetadata koji zahteva stvarnu klasu
// u constructor parametar tipu, ne obrisanu type-only referencu.
import { PrismaService } from "../prisma/prisma.service";
import { QuestsService } from "../quests/quests.service";

@Injectable()
export class WorkoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questsService: QuestsService,
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
   * level-up check -> stat points -> coins -> daily quest -> streak -> DTO.
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
      return await this.prisma.$transaction(async (tx) => {
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
          streak: newStreak,
        };
      });
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
