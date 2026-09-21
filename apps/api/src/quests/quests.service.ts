import { Injectable } from "@nestjs/common";
import {
  AI_QUEST_KIND,
  AI_QUEST_TARGET,
  BOSS_QUEST_TARGET_SESSIONS,
  calculateLevel,
  calculateRank,
  COIN_REWARDS,
  DEFAULT_LOCALE,
  PENALTY_QUEST_KIND,
  PENALTY_QUEST_TARGET_SESSIONS,
  SIDE_QUEST_KIND,
  SIDE_QUEST_TARGET,
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
  type AiQuestKind,
  type DailyQuestKind,
  type Locale,
  type MainQuestKind,
  type PenaltyQuestKind,
  type SideQuestKind,
  type WeeklyQuestKind,
  type XpSource,
} from "@risesolo/domain";
import type {
  AiQuestDto,
  BossQuestDto,
  DailyQuestDto,
  MainQuestDto,
  PenaltyQuestDto,
  PenaltyResultDto,
  SideQuestDto,
  WeeklyQuestDto,
} from "@risesolo/validation";
import type { Prisma, Quest, QuestType } from "@prisma/client";
import { startOfIsoWeek, startOfUtcDay } from "../common/date";
import { resolveLocale } from "../common/locale";
// AiService/SubscriptionsService MORAJU biti value import (ne "import type") -
// NestJS DI se oslanja na emitDecoratorMetadata koji zahteva stvarnu klasu u
// constructor parametar tipu, ne obrisanu type-only referencu.
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { getDailyQuestDisplay } from "./daily-quest-catalog";
import { getMainQuestDisplay } from "./main-quest-catalog";
import { getSideQuestDisplay } from "./side-quest-catalog";
import { getWeeklyQuestDisplay } from "./weekly-quest-catalog";

type Db = PrismaService | Prisma.TransactionClient;

const DAILY_QUEST_TARGET_SETS = 3;

function bossQuestTitle(locale: Locale): string {
  return locale === "en" ? "Weekly Boss Quest" : "Nedeljni Boss Quest";
}
function bossQuestDescription(locale: Locale): string {
  return locale === "en"
    ? `Finish ${BOSS_QUEST_TARGET_SESSIONS} workouts this week to defeat the Boss and earn a big reward.`
    : `Zavrsi ${BOSS_QUEST_TARGET_SESSIONS} treninga ove nedelje da pobedis Boss-a i osvojis veliku nagradu.`;
}

function penaltyQuestTitle(locale: Locale): string {
  return locale === "en" ? "Redemption" : "Iskupljenje";
}
function penaltyQuestDescription(locale: Locale): string {
  return locale === "en"
    ? `Finish ${PENALTY_QUEST_TARGET_SESSIONS} workouts today to recover the coins lost to a missed daily quest.`
    : `Zavrsi ${PENALTY_QUEST_TARGET_SESSIONS} treninga danas da povratis coins izgubljene propustenim dnevnim questom.`;
}

/**
 * Main Quest nema prirodan vremenski period (za razliku od Daily/Weekly/Boss)
 * - "date" kolona se ovde koristi samo kao SEKVENCIJALNI marker (epoch + broj
 * vec zavrsenih Main Quest-ova) da @@unique([userId, date, type]) i dalje
 * garantuje idempotentnost/race-safety bez nove kolone ili tabele.
 */
const MAIN_QUEST_EPOCH = new Date(Date.UTC(2020, 0, 1));

/**
 * Side Quest takodje nema prirodan vremenski period - isti sekvencijalni
 * marker princip kao Main Quest, ali odvojen epoch (razlicit tip questa,
 * pa razlicita "brojacka" sekvenca ne sme da se poklopi sa Main Questom).
 */
const SIDE_QUEST_EPOCH = new Date(Date.UTC(2021, 0, 1));

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Idempotentno: drugi poziv za isti (userId, date) vraca POSTOJECI quest
   * umesto da pravi duplikat - garantovano preko @@unique([userId, date, type])
   * u schema.prisma, ne samo "provere pa upisa" (race-safe).
   */
  async generateDailyQuest(userId: string, date: Date, db: Db = this.prisma, locale: Locale = DEFAULT_LOCALE): Promise<Quest> {
    const questDate = startOfUtcDay(date);
    const kind: DailyQuestKind = selectDailyQuestKind(userId, questDate);
    const display = getDailyQuestDisplay(kind, locale);
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
  async generateBossQuest(userId: string, date: Date, db: Db = this.prisma, locale: Locale = DEFAULT_LOCALE): Promise<Quest> {
    return this.generateQuest(
      userId,
      "BOSS",
      startOfIsoWeek(date),
      {
        title: bossQuestTitle(locale),
        description: bossQuestDescription(locale),
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
    const locale = await resolveLocale(this.prisma, userId);
    const quest = await this.generateDailyQuest(userId, new Date(), this.prisma, locale);
    return toDailyDto(quest);
  }

  async getCurrentBossQuest(userId: string): Promise<BossQuestDto> {
    const now = new Date();
    const locale = await resolveLocale(this.prisma, userId);
    const [quest, progress] = await Promise.all([
      this.generateBossQuest(userId, now, this.prisma, locale),
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
   *
   * Kada se kazna primeni, generise se i Penalty Quest za DANAS (vidi
   * generatePenaltyQuest) - igracu se daje NACIN da povrati bas TOLIKO
   * coins-a koliko je stvarno izgubio (`coinsLost`, VEC klampovano na
   * trenutno stanje - ne teorijski `penaltyCoins`, da refund ne bi bio
   * veci od stvarnog gubitka).
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

    const coinsLost = progression.coins - newCoins;
    const locale = await resolveLocale(db, userId);
    await this.generatePenaltyQuest(userId, now, coinsLost, db, locale);

    return { applied: true, missedQuestCount: pastDue.length, coinsLost };
  }

  /**
   * Penalty Quest = "iskupljenje" - za razliku od Boss/Daily/Weekly/Main/Side
   * Questa, NIKAD se ne generise samostalno na proizvoljan GET; postoji
   * ISKLJUCIVO kao posledica primenjene kazne (poziva se samo iz
   * expirePastDueDailyQuests, jednom po danu kada je kazna primenjena).
   * `coinRefund` je fiksiran na tacan iznos izgubljenih coins-a za TU kaznu.
   */
  async generatePenaltyQuest(
    userId: string,
    date: Date,
    coinRefund: number,
    db: Db = this.prisma,
    locale: Locale = DEFAULT_LOCALE,
  ): Promise<Quest> {
    return this.generateQuest(
      userId,
      "PENALTY",
      startOfUtcDay(date),
      {
        kind: PENALTY_QUEST_KIND,
        title: penaltyQuestTitle(locale),
        description: penaltyQuestDescription(locale),
        targetSets: PENALTY_QUEST_TARGET_SESSIONS,
        xpReward: XP_REWARDS.PENALTY_QUEST_COMPLETE,
        coinReward: coinRefund,
      },
      db,
    );
  }

  /**
   * Isti "prebrojavanje zavrsenih WorkoutSession" princip kao Boss Quest
   * (countCompletedSessionsThisWeek), samo po KALENDARSKOM DANU umesto po
   * ISO nedelji.
   */
  async countCompletedSessionsToday(userId: string, date: Date, db: Db = this.prisma): Promise<number> {
    const dayStart = startOfUtcDay(date);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return db.workoutSession.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: dayStart, lt: dayEnd } },
    });
  }

  /**
   * Read-only i namerno NE generise quest ako ne postoji (za razliku od
   * getCurrentBossQuest/getTodayQuest) - Penalty Quest postoji SAMO kada je
   * kazna stvarno primenjena danas (vidi expirePastDueDailyQuests). `quest:
   * null` je normalno/najcesce stanje (vecina dana nema propusten quest).
   *
   * Poziva expirePastDueDailyQuests OVDE takodje (ne samo u
   * PlayersService.getPlayerState) - Home ekran poziva GET /players/me i
   * GET /quests/penalty PARALELNO (nezavisni hook-ovi), pa bez ovoga bi
   * postojala trka: ako bi GET /quests/penalty stigao do baze PRE nego sto
   * GET /players/me primeni kaznu, ovaj poziv bi (tacno u tom trenutku)
   * legitimno vratio `quest: null`, ali bi ta vrednost ostala "zaglavljena"
   * u React state-u do sledeceg fokusa - korisnik ne bi vidio kartu iako je
   * kazna vec primenjena. expirePastDueDailyQuests je idempotentan (drugi
   * poziv istog dana ne nalazi vise "past due" questove pa ne kaznjava
   * dvaput), pa je ovo bezbedno.
   */
  async getCurrentPenaltyQuest(userId: string): Promise<{ quest: PenaltyQuestDto | null }> {
    const now = new Date();
    await this.expirePastDueDailyQuests(userId, now);
    const quest = await this.prisma.quest.findUnique({
      where: { userId_date_type: { userId, date: startOfUtcDay(now), type: "PENALTY" } },
    });
    if (!quest) {
      return { quest: null };
    }
    const progress = await this.countCompletedSessionsToday(userId, now);
    return { quest: toPenaltyDto(quest, progress) };
  }

  /**
   * AI Quest - Pro-gated bonus quest ciji title/description generise Claude
   * (vidi apps/api/src/ai/ai.service.ts generateQuestFlavor). Za razliku od
   * svih drugih questova, sadrzaj dolazi iz AI poziva, ne fiksnog kataloga.
   * Generise se NAJVISE JEDNOM po danu (ista idempotency provera kao
   * Daily/Boss Quest - findUnique PRE poziva AI-a, da se ne trosi Anthropic
   * budzet uzalud ako je vec generisan danas). `quest: null` je normalno
   * stanje za besplatne korisnike (AI Quest je Pro-gated) i za bilo koji dan
   * kada AI servis nije dostupan ili poziv ne uspe - graceful degradation,
   * NIKAD greska koja bi oborila ucitavanje Home ekrana.
   */
  async getCurrentAiQuest(userId: string): Promise<{ quest: AiQuestDto | null }> {
    const now = new Date();
    const today = startOfUtcDay(now);

    const existing = await this.prisma.quest.findUnique({
      where: { userId_date_type: { userId, date: today, type: "AI_GENERATED" } },
    });
    if (existing) {
      return { quest: toAiDto(existing) };
    }

    if (!this.aiService.isConfigured) {
      return { quest: null };
    }
    const hasProAccess = await this.subscriptionsService.hasProAccess(userId);
    if (!hasProAccess) {
      return { quest: null };
    }

    const [progression, stats] = await Promise.all([
      this.prisma.progression.findUnique({ where: { userId } }),
      this.prisma.playerStats.findUnique({ where: { userId } }),
    ]);
    if (!progression || !stats) {
      return { quest: null };
    }

    const level = calculateLevel(progression.totalXp);
    let flavor: { title: string; description: string };
    try {
      flavor = await this.aiService.generateQuestFlavor({
        level,
        rank: calculateRank(level),
        stats: {
          strength: stats.strength,
          agility: stats.agility,
          endurance: stats.endurance,
          vitality: stats.vitality,
          intelligence: stats.intelligence,
        },
        currentStreak: progression.currentStreak,
      });
    } catch {
      return { quest: null };
    }

    const quest = await this.generateQuest(
      userId,
      "AI_GENERATED",
      today,
      {
        kind: AI_QUEST_KIND,
        title: flavor.title,
        description: flavor.description,
        targetSets: AI_QUEST_TARGET,
        xpReward: XP_REWARDS.AI_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.AI_QUEST_COMPLETE,
      },
      this.prisma,
    );

    return { quest: toAiDto(quest) };
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
  async generateWeeklyQuest(userId: string, date: Date, db: Db = this.prisma, locale: Locale = DEFAULT_LOCALE): Promise<Quest> {
    const weekStart = startOfIsoWeek(date);
    const kind: WeeklyQuestKind = selectWeeklyQuestKind(userId, weekStart);
    const display = getWeeklyQuestDisplay(kind, locale);
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
    const locale = await resolveLocale(this.prisma, userId);
    let quest = await this.generateWeeklyQuest(userId, now, this.prisma, locale);
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
  async generateMainQuest(userId: string, db: Db = this.prisma, locale: Locale = DEFAULT_LOCALE): Promise<Quest> {
    const completedCount = await db.quest.count({ where: { userId, type: "MAIN", status: "COMPLETED" } });
    const kind: MainQuestKind = selectMainQuestKind(completedCount);
    const tier = mainQuestTier(completedCount);
    const target = mainQuestTarget(tier);
    const display = getMainQuestDisplay(kind, target, locale);
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
    const locale = await resolveLocale(this.prisma, userId);
    let quest = await this.generateMainQuest(userId, this.prisma, locale);
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

  /**
   * Side Quest = bonus izazov vezan za KONKRETNU sesiju treninga (MVP ima
   * samo jednu vrstu - "nova vezba"). Za razliku od Weekly/Main Questa,
   * NEMA nezavisno izvodljiv progres (ne postoji "trenutno stanje" koje bi
   * GET mogao da procita u proizvoljnom trenutku) - zato se generise ovde
   * (sekvencijalni marker, isti princip kao Main Quest), ali zavrsava
   * ISKLJUCIVO iz WorkoutsService.completeSession preko
   * completeQuestIfPending. Vraca `null` ako je korisnik vec zavrsio seriju
   * SVAKE vezbe iz biblioteke (nema vise sta da bude "nova vezba") - biblioteka
   * je konacna, pa je ovo dugorocno moguce iako retko u praksi.
   */
  async generateSideQuest(userId: string, db: Db = this.prisma, locale: Locale = DEFAULT_LOCALE): Promise<Quest | null> {
    const completedCount = await db.quest.count({ where: { userId, type: "SIDE", status: "COMPLETED" } });
    const sequenceDate = new Date(SIDE_QUEST_EPOCH.getTime() + completedCount * 24 * 60 * 60 * 1000);

    const existing = await db.quest.findUnique({
      where: { userId_date_type: { userId, date: sequenceDate, type: "SIDE" } },
    });
    if (existing) {
      return existing;
    }

    if (await this.hasTriedEveryExercise(userId, db)) {
      return null;
    }

    const display = getSideQuestDisplay(SIDE_QUEST_KIND, locale);
    return this.generateQuest(
      userId,
      "SIDE",
      sequenceDate,
      {
        kind: SIDE_QUEST_KIND,
        title: display.title,
        description: display.description,
        targetSets: SIDE_QUEST_TARGET,
        xpReward: XP_REWARDS.SIDE_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.SIDE_QUEST_COMPLETE,
      },
      db,
    );
  }

  /** Iscrpljenost: korisnik je vec zavrsio bar jednu seriju SVAKE vezbe iz biblioteke. */
  private async hasTriedEveryExercise(userId: string, db: Db): Promise<boolean> {
    const [totalExercises, completedExerciseIds] = await Promise.all([
      db.exercise.count(),
      db.workoutSet.findMany({
        where: { completed: true, session: { userId, status: "COMPLETED" } },
        distinct: ["exerciseId"],
        select: { exerciseId: true },
      }),
    ]);
    return completedExerciseIds.length >= totalExercises;
  }

  /**
   * Da li ova (upravo zavrsena) sesija sadrzi bar jednu zavrsenu seriju vezbe
   * koju korisnik NIKAD pre nije zavrsio u nekoj drugoj COMPLETED sesiji. Poziva
   * se posle sto je session.status vec azuriran na COMPLETED u istoj transakciji
   * (isti princip kao countCompletedSessionsThisWeek za Boss Quest) - iskljucuje
   * `sessionId` iz "prethodnih" da tekuca sesija ne broji samu sebe.
   */
  async hasCompletedNewExercise(userId: string, sessionId: string, db: Db = this.prisma): Promise<boolean> {
    const currentExerciseIds = await db.workoutSet.findMany({
      where: { sessionId, completed: true },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    });
    if (currentExerciseIds.length === 0) {
      return false;
    }

    const priorExerciseIds = await db.workoutSet.findMany({
      where: { completed: true, session: { userId, status: "COMPLETED", id: { not: sessionId } } },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    });
    const priorSet = new Set(priorExerciseIds.map((row) => row.exerciseId));
    return currentExerciseIds.some((row) => !priorSet.has(row.exerciseId));
  }

  /**
   * Read-only (nema lenjog zavrsetka ovde, za razliku od getCurrentWeeklyQuest/
   * getCurrentMainQuest) - vidi objasnjenje u generateSideQuest. `quest: null`
   * znaci da je korisnik iscrpeo biblioteku vezbi (nema vise "novih" vezbi).
   */
  async getCurrentSideQuest(userId: string): Promise<{ quest: SideQuestDto | null }> {
    const locale = await resolveLocale(this.prisma, userId);
    const quest = await this.generateSideQuest(userId, this.prisma, locale);
    return { quest: quest ? toSideDto(quest) : null };
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

/**
 * Za razliku od Boss/Weekly/Main Questa, progres se NE izvodi iz posebnog
 * upita - ovaj quest ili JOS NIJE zavrsen (progress=0) ili JE (progress=target),
 * jer se zavrsava iskljucivo unutar WorkoutsService.completeSession (nema
 * "delimicno" stanje da bi ga trebalo racunati).
 */
function toSideDto(quest: Quest): SideQuestDto {
  const kind = quest.kind as SideQuestKind;
  const targetProgress = quest.targetSets ?? SIDE_QUEST_TARGET;
  return {
    id: quest.id,
    kind,
    title: quest.title,
    description: quest.description,
    targetProgress,
    progress: quest.status === "COMPLETED" ? targetProgress : 0,
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}

/** Isti "prebrojani progres, klampovan na cilj" princip kao Boss Quest. */
function toPenaltyDto(quest: Quest, progress: number): PenaltyQuestDto {
  const kind = quest.kind as PenaltyQuestKind;
  const targetProgress = quest.targetSets ?? PENALTY_QUEST_TARGET_SESSIONS;
  return {
    id: quest.id,
    kind,
    title: quest.title,
    description: quest.description,
    targetProgress,
    progress: Math.min(progress, targetProgress),
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}

/**
 * Isti "progres nije izveden iz posebnog upita" princip kao Side Quest -
 * ili je 0 (jos nezavrseno) ili targetProgress (zavrseno), jer se AI Quest
 * zavrsava iskljucivo unutar WorkoutsService.completeSession.
 */
function toAiDto(quest: Quest): AiQuestDto {
  const kind = quest.kind as AiQuestKind;
  const targetProgress = quest.targetSets ?? AI_QUEST_TARGET;
  return {
    id: quest.id,
    kind,
    title: quest.title,
    description: quest.description,
    targetProgress,
    progress: quest.status === "COMPLETED" ? targetProgress : 0,
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}
