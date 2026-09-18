import { Injectable } from "@nestjs/common";
import {
  BOSS_QUEST_TARGET_SESSIONS,
  COIN_REWARDS,
  WEEKLY_NUTRITION_LOG_DAYS_TARGET,
  WEEKLY_XP_TARGET,
  XP_REWARDS,
  applyCoinPenalty,
  calculatePenaltyCoins,
  detectLevelUp,
  isMainQuestComplete,
  isWeeklyQuestComplete,
  MAIN_QUEST_TIER_STEP,
  mainQuestTarget,
  mainQuestTier,
  selectDailyQuestKind,
  selectMainQuestKind,
  selectWeeklyQuestKind,
  statPointsForLevelsGained,
  type DailyQuestKind,
  type MainQuestKind,
  type WeeklyQuestKind,
  type XpSource,
} from "@risesolo/domain";
import type { BossQuestDto, DailyQuestDto, MainQuestDto, PenaltyResultDto, WeeklyQuestDto } from "@risesolo/validation";
import type { Prisma, Quest, QuestType } from "@prisma/client";
import { startOfIsoWeek, startOfUtcDay } from "../common/date";
import { PrismaService } from "../prisma/prisma.service";
import { getDailyQuestDisplay } from "./daily-quest-catalog";
import { getMainQuestDisplay } from "./main-quest-catalog";
import { getWeeklyQuestDisplay } from "./weekly-quest-catalog";

type Db = PrismaService | Prisma.TransactionClient;

const DAILY_QUEST_TARGET_SETS = 3;

const BOSS_QUEST_TITLE = "Nedeljni Boss Quest";
const BOSS_QUEST_DESCRIPTION = `Zavrsi ${BOSS_QUEST_TARGET_SESSIONS} treninga ove nedelje da pobedis Boss-a i osvojis veliku nagradu.`;

/**
 * Main Quest nema prirodan vremenski period (za razliku od Daily/Weekly/Boss)
 * - "date" kolona se ovde koristi samo kao SEKVENCIJALNI marker (epoch + broj
 * vec zavrsenih Main Quest-ova) da @@unique([userId, date, type]) i dalje
 * garantuje idempotentnost/race-safety bez nove kolone ili tabele.
 */
const MAIN_QUEST_EPOCH = new Date(Date.UTC(2020, 0, 1));

interface QuestFields {
  kind?: string;
  title: string;
  description: string;
  targetSets: number;
  xpReward: number;
  coinReward: number;
}

export interface QuestRewardResult {
  completed: boolean;
  xpGained: number;
  coinsGained: number;
  levelUp: boolean;
  newLevel: number;
  statPointsGained: number;
}

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotentno: drugi poziv za isti (userId, date) vraca POSTOJECI quest
   * umesto da pravi duplikat - garantovano preko @@unique([userId, date, type])
   * u schema.prisma, ne samo "provere pa upisa" (race-safe).
   */
  async generateDailyQuest(userId: string, date: Date, db: Db = this.prisma): Promise<Quest> {
    const questDate = startOfUtcDay(date);
    const kind: DailyQuestKind = selectDailyQuestKind(userId, questDate);
    const display = getDailyQuestDisplay(kind);
    return this.generateQuest(
      userId,
      "DAILY",
      questDate,
      {
        kind,
        title: display.title,
        description: display.description,
        targetSets: DAILY_QUEST_TARGET_SETS,
        xpReward: XP_REWARDS.DAILY_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.DAILY_QUEST_COMPLETE,
      },
      db,
    );
  }

  /** Isti idempotency princip kao dnevni quest, ali po ISO nedelji (date = ponedeljak te nedelje). */
  async generateBossQuest(userId: string, date: Date, db: Db = this.prisma): Promise<Quest> {
    return this.generateQuest(
      userId,
      "BOSS",
      startOfIsoWeek(date),
      {
        title: BOSS_QUEST_TITLE,
        description: BOSS_QUEST_DESCRIPTION,
        targetSets: BOSS_QUEST_TARGET_SESSIONS,
        xpReward: XP_REWARDS.BOSS_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.BOSS_QUEST_COMPLETE,
      },
      db,
    );
  }

  /**
   * Boss quest progres se NAMERNO ne cuva na questu - racuna se prebrojavanjem
   * zavrsenih WorkoutSession u toj ISO nedelji (isti princip kao total_xp:
   * izvedeno, ne cuvano, da ne bi doslo do drift-a).
   */
  async countCompletedSessionsThisWeek(userId: string, date: Date, db: Db = this.prisma): Promise<number> {
    const weekStart = startOfIsoWeek(date);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return db.workoutSession.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: weekStart, lt: weekEnd } },
    });
  }

  async getTodayQuest(userId: string): Promise<DailyQuestDto> {
    const quest = await this.generateDailyQuest(userId, new Date());
    return toDailyDto(quest);
  }

  async getCurrentBossQuest(userId: string): Promise<BossQuestDto> {
    const now = new Date();
    const [quest, progress] = await Promise.all([
      this.generateBossQuest(userId, now),
      this.countCompletedSessionsThisWeek(userId, now),
    ]);
    return toBossDto(quest, progress);
  }

  /**
   * Penalty System: svaki DAILY quest iz proslog dana koji nije COMPLETED
   * postaje EXPIRED, a igrac gubi coins (nikad ispod 0; total_xp i stat
   * poeni se ne diraju - level ne sme da "padne"). Prelazak u EXPIRED je
   * sam po sebi idempotency marker - sledeci poziv vise ne nalazi taj
   * quest medju "past due", pa se ne penalizuje dvaput. Poziva se iz
   * PlayersService.getPlayerState (lazy provera, isti princip kao
   * generateDailyQuest/generateBossQuest - nema cron/scheduler u MVP-u).
   */
  async expirePastDueDailyQuests(userId: string, now: Date, db: Db = this.prisma): Promise<PenaltyResultDto> {
    const today = startOfUtcDay(now);
    const pastDue = await db.quest.findMany({
      where: { userId, type: "DAILY", status: { in: ["AVAILABLE", "IN_PROGRESS"] }, date: { lt: today } },
    });
    if (pastDue.length === 0) {
      return { applied: false, missedQuestCount: 0, coinsLost: 0 };
    }

    await db.quest.updateMany({
      where: { id: { in: pastDue.map((quest) => quest.id) } },
      data: { status: "EXPIRED" },
    });

    const progression = await db.progression.findUniqueOrThrow({ where: { userId } });
    const penaltyCoins = calculatePenaltyCoins(pastDue.length);
    const newCoins = applyCoinPenalty(progression.coins, penaltyCoins);
    await db.progression.update({ where: { userId }, data: { coins: newCoins } });

    return { applied: true, missedQuestCount: pastDue.length, coinsLost: progression.coins - newCoins };
  }

  /**
   * Server-authoritative zavrsetak - poziva se SAMO iz workout completion
   * engine-a (nikad direktno na zahtev klijenta "completed: true"). Vraca
   * `null` ako je quest vec bio COMPLETED/EXPIRED (nema duplog zavrsetka).
   */
  async completeQuestIfPending(questId: string, db: Db = this.prisma): Promise<Quest | null> {
    const quest = await db.quest.findUnique({ where: { id: questId } });
    if (!quest || quest.status === "COMPLETED" || quest.status === "EXPIRED") {
      return null;
    }
    return db.quest.update({
      where: { id: questId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  /**
   * Zaseban, namerno UZI nagradni put za dnevne questove zavrsene van
   * workout completion engine-a (trenutno samo LOG_NUTRITION kind - vidi
   * NutritionService.createEntry). Daje XP/coins/level-up/stat poene kao i
   * workout put, ali NAMERNO ne dira streak ni cehovski XP doprinos - oba
   * su po domenskom dizajnu vezana iskljucivo za trening aktivnost.
   */
  async completeDailyQuestRewardIfPending(userId: string, questId: string, db: Db = this.prisma): Promise<QuestRewardResult> {
    const completedQuest = await this.completeQuestIfPending(questId, db);
    return this.grantQuestReward(userId, completedQuest, "DAILY_QUEST_COMPLETE", db);
  }

  /** Isti idempotency princip kao dnevni/boss quest, ali po ISO nedelji (date = ponedeljak te nedelje). */
  async generateWeeklyQuest(userId: string, date: Date, db: Db = this.prisma): Promise<Quest> {
    const weekStart = startOfIsoWeek(date);
    const kind: WeeklyQuestKind = selectWeeklyQuestKind(userId, weekStart);
    const display = getWeeklyQuestDisplay(kind);
    return this.generateQuest(
      userId,
      "WEEKLY",
      weekStart,
      {
        kind,
        title: display.title,
        description: display.description,
        targetSets: kind === "XP_TARGET" ? WEEKLY_XP_TARGET : WEEKLY_NUTRITION_LOG_DAYS_TARGET,
        xpReward: XP_REWARDS.WEEKLY_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.WEEKLY_QUEST_COMPLETE,
      },
      db,
    );
  }

  /**
   * Nedeljni quest progres se NAMERNO ne cuva - racuna se izvedeno po
   * kind-u (isti princip kao Boss Quest): XP_TARGET prebrojava XpEvent
   * amount-e u toj ISO nedelji (SVI izvori - trening, questovi, itd.),
   * NUTRITION_LOG_DAYS prebrojava RAZLICITE dane sa unosom ishrane.
   */
  async getWeeklyQuestProgress(userId: string, kind: WeeklyQuestKind, date: Date, db: Db = this.prisma): Promise<number> {
    const weekStart = startOfIsoWeek(date);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (kind === "XP_TARGET") {
      const events = await db.xpEvent.findMany({
        where: { userId, createdAt: { gte: weekStart, lt: weekEnd } },
        select: { amount: true },
      });
      return events.reduce((sum, event) => sum + event.amount, 0);
    }
    const rows = await db.nutritionEntry.findMany({
      where: { userId, date: { gte: weekStart, lt: weekEnd } },
      distinct: ["date"],
      select: { date: true },
    });
    return rows.length;
  }

  /**
   * Kombinuje generisanje + progres + LAZY zavrsetak (ako je cilj vec
   * dostignut u trenutku ocitavanja) - isti "lazy provera na pristup, bez
   * cron-a" princip kao expirePastDueDailyQuests. GET /quests/weekly je
   * jedino mesto gde se nedeljni quest zavrsava - nema posebnog trigera u
   * WorkoutsService/NutritionService jer progres dolazi iz vec postojecih
   * dogadjaja (XpEvent/NutritionEntry), ne iz jedne konkretne akcije.
   */
  async getCurrentWeeklyQuest(userId: string): Promise<WeeklyQuestDto> {
    const now = new Date();
    let quest = await this.generateWeeklyQuest(userId, now);
    const kind = quest.kind as WeeklyQuestKind;
    const targetProgress = quest.targetSets ?? WEEKLY_XP_TARGET;
    const progress = await this.getWeeklyQuestProgress(userId, kind, now);

    if (quest.status !== "COMPLETED" && quest.status !== "EXPIRED" && isWeeklyQuestComplete(progress, targetProgress)) {
      const result = await this.completeWeeklyQuestRewardIfPending(userId, quest.id);
      if (result.completed) {
        quest = { ...quest, status: "COMPLETED" };
      }
    }

    return toWeeklyDto(quest, progress, targetProgress);
  }

  /**
   * Isti "uzi nagradni put" princip kao completeDailyQuestRewardIfPending -
   * XP/coins/level-up/stat poeni, NAMERNO bez streak-a i cehovskog doprinosa
   * (nedeljni quest nije trening aktivnost, samo posledica nje).
   */
  async completeWeeklyQuestRewardIfPending(userId: string, questId: string, db: Db = this.prisma): Promise<QuestRewardResult> {
    const completedQuest = await this.completeQuestIfPending(questId, db);
    return this.grantQuestReward(userId, completedQuest, "WEEKLY_QUEST_COMPLETE", db);
  }

  /**
   * Main Quest = dugorocni LANAC (za razliku od Daily/Weekly/Boss, NIKAD ne
   * istice niti se resetuje po datumu). Kind/tier se izvode iz broja vec
   * ZAVRSENIH Main Quest-ova (derive, don't cache) - rotacija kroz stat-ove
   * (snaga->agilnost->...->inteligencija->snaga na visem tier-u).
   */
  async generateMainQuest(userId: string, db: Db = this.prisma): Promise<Quest> {
    const completedCount = await db.quest.count({ where: { userId, type: "MAIN", status: "COMPLETED" } });
    const kind: MainQuestKind = selectMainQuestKind(completedCount);
    const tier = mainQuestTier(completedCount);
    const target = mainQuestTarget(tier);
    const display = getMainQuestDisplay(kind, target);
    const sequenceDate = new Date(MAIN_QUEST_EPOCH.getTime() + completedCount * 24 * 60 * 60 * 1000);
    return this.generateQuest(
      userId,
      "MAIN",
      sequenceDate,
      {
        kind,
        title: display.title,
        description: display.description,
        targetSets: target,
        xpReward: XP_REWARDS.MAIN_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.MAIN_QUEST_COMPLETE,
      },
      db,
    );
  }

  /** Progres = TRENUTNA vrednost tog stata (PlayerStats) - izvedeno, ne cuvano posebno na questu. */
  async getMainQuestProgress(userId: string, kind: MainQuestKind, db: Db = this.prisma): Promise<number> {
    const stats = await db.playerStats.findUniqueOrThrow({ where: { userId } });
    return stats[kind];
  }

  /**
   * Isti "generate + progres + lazy zavrsetak" obrazac kao
   * getCurrentWeeklyQuest. Kada se ovaj Main Quest zavrsi, SLEDECI poziv
   * generateMainQuest prirodno racuna novi (visi) completedCount i pravi
   * SLEDECI quest u lancu - nema posebne "regenerate" logike.
   */
  async getCurrentMainQuest(userId: string): Promise<MainQuestDto> {
    let quest = await this.generateMainQuest(userId);
    const kind = quest.kind as MainQuestKind;
    const targetProgress = quest.targetSets ?? mainQuestTarget(1);
    const progress = await this.getMainQuestProgress(userId, kind);

    if (quest.status !== "COMPLETED" && quest.status !== "EXPIRED" && isMainQuestComplete(progress, targetProgress)) {
      const result = await this.completeMainQuestRewardIfPending(userId, quest.id);
      if (result.completed) {
        quest = { ...quest, status: "COMPLETED" };
      }
    }

    return toMainDto(quest, progress, targetProgress);
  }

  /**
   * Isti "uzi nagradni put" princip kao completeWeeklyQuestRewardIfPending -
   * XP/coins/level-up/stat poeni, NAMERNO bez streak-a i cehovskog doprinosa.
   */
  async completeMainQuestRewardIfPending(userId: string, questId: string, db: Db = this.prisma): Promise<QuestRewardResult> {
    const completedQuest = await this.completeQuestIfPending(questId, db);
    return this.grantQuestReward(userId, completedQuest, "MAIN_QUEST_COMPLETE", db);
  }

  private async grantQuestReward(userId: string, completedQuest: Quest | null, source: XpSource, db: Db): Promise<QuestRewardResult> {
    if (!completedQuest) {
      return { completed: false, xpGained: 0, coinsGained: 0, levelUp: false, newLevel: 0, statPointsGained: 0 };
    }

    const progressionBefore = await db.progression.findUniqueOrThrow({ where: { userId } });
    await db.xpEvent.create({
      data: { userId, source, sourceId: completedQuest.id, amount: completedQuest.xpReward },
    });

    const levelUpResult = detectLevelUp(progressionBefore.totalXp, completedQuest.xpReward);
    const statPointsGained = statPointsForLevelsGained(levelUpResult.levelsGained);

    await db.progression.update({
      where: { userId },
      data: { totalXp: { increment: completedQuest.xpReward }, coins: { increment: completedQuest.coinReward } },
    });

    if (statPointsGained > 0) {
      await db.playerStats.update({ where: { userId }, data: { statPoints: { increment: statPointsGained } } });
    }

    return {
      completed: true,
      xpGained: completedQuest.xpReward,
      coinsGained: completedQuest.coinReward,
      levelUp: levelUpResult.leveledUp,
      newLevel: levelUpResult.newLevel,
      statPointsGained,
    };
  }

  private async generateQuest(userId: string, type: QuestType, date: Date, fields: QuestFields, db: Db): Promise<Quest> {
    const existing = await db.quest.findUnique({
      where: { userId_date_type: { userId, date, type } },
    });
    if (existing) {
      return existing;
    }

    try {
      return await db.quest.create({
        data: { userId, date, type, targetReps: null, status: "AVAILABLE", ...fields },
      });
    } catch (error) {
      // Race: neko drugi zahtev je kreirao isti quest izmedju findUnique i create (P2002 = unique violation).
      if (isUniqueConstraintError(error)) {
        const race = await db.quest.findUnique({
          where: { userId_date_type: { userId, date, type } },
        });
        if (race) {
          return race;
        }
      }
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function toDailyDto(quest: Quest): DailyQuestDto {
  return {
    id: quest.id,
    date: quest.date.toISOString().slice(0, 10),
    kind: quest.kind as DailyQuestKind,
    title: quest.title,
    description: quest.description,
    targetReps: quest.targetReps,
    targetSets: quest.targetSets,
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}

function toBossDto(quest: Quest, progress: number): BossQuestDto {
  const targetSessions = quest.targetSets ?? BOSS_QUEST_TARGET_SESSIONS;
  return {
    id: quest.id,
    weekStart: quest.date.toISOString().slice(0, 10),
    title: quest.title,
    description: quest.description,
    targetSessions,
    progress: Math.min(progress, targetSessions),
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}

function toWeeklyDto(quest: Quest, progress: number, targetProgress: number): WeeklyQuestDto {
  return {
    id: quest.id,
    weekStart: quest.date.toISOString().slice(0, 10),
    kind: quest.kind as WeeklyQuestKind,
    title: quest.title,
    description: quest.description,
    targetProgress,
    progress: Math.min(progress, targetProgress),
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}

function toMainDto(quest: Quest, progress: number, targetProgress: number): MainQuestDto {
  const kind = quest.kind as MainQuestKind;
  return {
    id: quest.id,
    kind,
    tier: Math.max(1, Math.round(targetProgress / MAIN_QUEST_TIER_STEP)),
    title: quest.title,
    description: quest.description,
    targetProgress,
    progress: Math.min(progress, targetProgress),
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}
