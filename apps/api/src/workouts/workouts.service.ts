import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  BOSS_QUEST_TARGET_SESSIONS,
  COIN_REWARDS,
  PENALTY_QUEST_TARGET_SESSIONS,
  XP_REWARDS,
  detectLevelUp,
  statPointsForLevelsGained,
  computeStreakAfterCompletion,
  isBossQuestComplete,
  isPenaltyQuestComplete,
} from "@risesolo/domain";
import type {
  ActiveWorkoutSessionResponse,
  CompleteWorkoutResponse,
  LogSetRequest,
  StartWorkoutSessionRequest,
  WorkoutSessionDto,
  WorkoutSetDto,
} from "@risesolo/validation";
import type { Prisma, WorkoutSession } from "@prisma/client";
import { diffInUtcDays, startOfUtcDay } from "../common/date";
// PrismaService/QuestsService/GuildsService MORAJU biti value import (ne
// "import type") - NestJS DI se oslanja na emitDecoratorMetadata koji
// zahteva stvarnu klasu u constructor parametar tipu, ne obrisanu type-only
// referencu.
import { AchievementsService } from "../achievements/achievements.service";
import { GuildsService } from "../guilds/guilds.service";
import { InventoryService } from "../inventory/inventory.service";
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
    private readonly achievementsService: AchievementsService,
    private readonly inventoryService: InventoryService,
  ) {}

  async startSession(userId: string, dto: StartWorkoutSessionRequest): Promise<WorkoutSessionDto> {
    if (dto.workoutId) {
      const workout = await this.prisma.workout.findUnique({ where: { id: dto.workoutId } });
      if (!workout || workout.userId !== userId) {
        throw new NotFoundException("Workout template nije pronadjen");
      }
    }

    // Najvise jedna aktivna sesija po korisniku - sprecava "sirenje" napustenih
    // treninga i cini GET /workouts/sessions/active jednoznacnim (vidi index
    // [userId, status] u schema.prisma, ovde konacno iskoriscen).
    const existingActive = await this.prisma.workoutSession.findFirst({
      where: { userId, status: "IN_PROGRESS" },
    });
    if (existingActive) {
      throw new ConflictException("Vec imas trening u toku. Nastavi ga ili odustani pre pokretanja novog.");
    }

    const session = await this.prisma.workoutSession.create({
      data: { userId, workoutId: dto.workoutId ?? null },
    });
    return toSessionDto(session);
  }

  /** Korisnikova pauzirana (IN_PROGRESS) sesija sa vec ulogovanim serijama, ili null. */
  async getActiveSession(userId: string): Promise<ActiveWorkoutSessionResponse> {
    const session = await this.prisma.workoutSession.findFirst({
      where: { userId, status: "IN_PROGRESS" },
      include: {
        sets: {
          orderBy: { setNumber: "asc" },
          include: { exercise: { select: { slug: true, name: true } } },
        },
      },
    });
    if (!session) {
      return { session: null, sets: [] };
    }
    return { session: toSessionDto(session), sets: session.sets.map(toSetDto) };
  }

  async abandonSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    await this.prisma.workoutSession.update({
      where: { id: session.id },
      data: { status: "ABANDONED" },
    });
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

        // Danasnji quest se automatski zavrsava prvim zavrsenim treningom u danu (ako vec nije)
        // - ali SAMO ako je danasnji quest WORKOUT_COMPLETE kind (varijetet dnevnih questova,
        // vidi @risesolo/domain daily-quest-pool). LOG_NUTRITION kind se zavrsava iskljucivo
        // iz NutritionService.createEntry.
        const today = new Date();
        const quest = await this.questsService.generateDailyQuest(userId, today, tx);
        const completedQuest =
          quest.kind === "WORKOUT_COMPLETE" ? await this.questsService.completeQuestIfPending(quest.id, tx) : null;
        const questCompleted = completedQuest !== null;
        if (questCompleted) {
          await tx.xpEvent.create({
            data: { userId, source: "DAILY_QUEST_COMPLETE", sourceId: quest.id, amount: quest.xpReward },
          });
          xpGained += quest.xpReward;
          coinsGained += quest.coinReward;
        }

        // AI Quest - postoji SAMO ako je vec generisan danas preko GET /quests/ai (vidi
        // QuestsService.getCurrentAiQuest); NIKAD se ne generise ovde (poziv Claude API-ja
        // ne sme da blokira/ugrozi ovu DB transakciju - vidi QuestsService.getCurrentAiQuest).
        // Zavrsava se identicno Daily Quest-ovom WORKOUT_COMPLETE kind-u - bilo koji zavrsen
        // trening danas (razlika izmedju ova dva questa je IZVOR sadrzaja, ne mehanika).
        const aiQuest = await tx.quest.findUnique({
          where: { userId_date_type: { userId, date: startOfUtcDay(today), type: "AI_GENERATED" } },
        });
        let aiQuestCompleted = false;
        if (aiQuest && aiQuest.status !== "COMPLETED" && aiQuest.status !== "EXPIRED") {
          const completedAiQuest = await this.questsService.completeQuestIfPending(aiQuest.id, tx);
          aiQuestCompleted = completedAiQuest !== null;
          if (aiQuestCompleted) {
            await tx.xpEvent.create({
              data: { userId, source: "AI_QUEST_COMPLETE", sourceId: aiQuest.id, amount: aiQuest.xpReward },
            });
            xpGained += aiQuest.xpReward;
            coinsGained += aiQuest.coinReward;
          }
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

        // Penalty Quest ("Iskupljenje") - postoji SAMO ako je Penalty System danas vec
        // primenio kaznu (vidi QuestsService.expirePastDueDailyQuests/generatePenaltyQuest);
        // najcesce ne postoji (findUnique vraca null). Zavrsava se kada broj zavrsenih
        // treninga DANAS (uklj. ovu sesiju) dostigne cilj, isti princip kao Boss Quest samo
        // po kalendarskom danu. `coinReward` je dinamican - tacan iznos ranije izgubljenih coins-a.
        const penaltyQuest = await tx.quest.findUnique({
          where: { userId_date_type: { userId, date: startOfUtcDay(today), type: "PENALTY" } },
        });
        let penaltyQuestCompleted = false;
        if (penaltyQuest && penaltyQuest.status !== "COMPLETED" && penaltyQuest.status !== "EXPIRED") {
          const completedSessionsToday = await this.questsService.countCompletedSessionsToday(userId, today, tx);
          if (isPenaltyQuestComplete(completedSessionsToday, penaltyQuest.targetSets ?? PENALTY_QUEST_TARGET_SESSIONS)) {
            const completedPenaltyQuest = await this.questsService.completeQuestIfPending(penaltyQuest.id, tx);
            penaltyQuestCompleted = completedPenaltyQuest !== null;
            if (penaltyQuestCompleted) {
              await tx.xpEvent.create({
                data: { userId, source: "PENALTY_QUEST_COMPLETE", sourceId: penaltyQuest.id, amount: penaltyQuest.xpReward },
              });
              xpGained += penaltyQuest.xpReward;
              coinsGained += penaltyQuest.coinReward;
            }
          }
        }

        // Sporedni quest (Side Quest) - "nova vezba": zavrsava se ako ova sesija sadrzi
        // zavrsenu seriju vezbe koju korisnik NIKAD pre nije zavrsio. Za razliku od
        // Weekly/Main questa, ne moze se lenjo zavrsiti na GET-u (uslov je vezan za ovu
        // konkretnu sesiju) - zato se generise i zavrsava ovde. `sideQuest === null`
        // znaci da je korisnik iscrpeo biblioteku vezbi (vidi QuestsService.generateSideQuest).
        const sideQuest = await this.questsService.generateSideQuest(userId, tx);
        let sideQuestCompleted = false;
        if (sideQuest && sideQuest.status !== "COMPLETED" && sideQuest.status !== "EXPIRED") {
          const hasNewExercise = await this.questsService.hasCompletedNewExercise(userId, session.id, tx);
          if (hasNewExercise) {
            const completedSideQuest = await this.questsService.completeQuestIfPending(sideQuest.id, tx);
            sideQuestCompleted = completedSideQuest !== null;
            if (sideQuestCompleted) {
              await tx.xpEvent.create({
                data: { userId, source: "SIDE_QUEST_COMPLETE", sourceId: sideQuest.id, amount: sideQuest.xpReward },
              });
              xpGained += sideQuest.xpReward;
              coinsGained += sideQuest.coinReward;
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
          sideQuestCompleted,
          penaltyQuestCompleted,
          aiQuestCompleted,
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

      // Achievement evaluacija takodje ide POSLE transakcije - cita bas
      // upisane XpEvent/Progression redove pa moze da otkljuca nove badge-ove.
      this.achievementsService
        .evaluateAndUnlock(userId)
        .then((newlyUnlocked) => this.achievementsService.notifyNewlyUnlocked(userId, newlyUnlocked))
        .catch(() => undefined);

      // Hidden Item evaluacija - isti princip kao achievements (fire-and-
      // forget posle transakcije), namerno bez push notifikacije da otkrice
      // ostane iznenadjenje dok igrac sam ne otvori Inventory ekran.
      this.inventoryService.evaluateAndDiscover(userId).catch(() => undefined);
      // Guild Item evaluacija - isti princip, hvata i raid/treasury/nivo
      // promene koje su se desile posle ovog treninga (npr. raid upravo
      // zavrsen istom transakcijom iznad).
      this.inventoryService.evaluateAndDiscoverGuild(userId).catch(() => undefined);
      // AI Item evaluacija - isti princip, hvata nivo koji je upravo
      // dostignut ovim treningom. Pro/AI gate zivi u InventoryService, tako
      // da za besplatne korisnike ovo tiho ne radi nista.
      this.inventoryService.evaluateAndDiscoverAi(userId).catch(() => undefined);
      // Recovery Item evaluacija - isti princip, hvata razmak izmedju
      // treninga koji je upravo nastao (ili prestao da postoji) ovim
      // zavrsenim treningom.
      this.inventoryService.evaluateAndDiscoverRecovery(userId).catch(() => undefined);

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
    workoutId: session.workoutId,
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
  };
}

type WorkoutSetWithExercise = Prisma.WorkoutSetGetPayload<{
  include: { exercise: { select: { slug: true; name: true } } };
}>;

function toSetDto(set: WorkoutSetWithExercise): WorkoutSetDto {
  return {
    exerciseId: set.exerciseId,
    exerciseSlug: set.exercise.slug,
    exerciseName: set.exercise.name,
    setNumber: set.setNumber,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    completed: set.completed,
  };
}
