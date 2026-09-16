import { Injectable } from "@nestjs/common";
import {
  ACHIEVEMENT_DEFINITIONS,
  assertNever,
  calculateLevel,
  evaluateNewlyUnlockedAchievements,
  type AchievementId,
  type AchievementStatsSnapshot,
} from "@risesolo/domain";
import type { AchievementDto } from "@risesolo/validation";
import type { Prisma } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

interface AchievementNotificationContent {
  title: string;
  body: string;
}

/**
 * Tekst push notifikacije po achievement-u - namerno odvojeno od domain sloja
 * (isti princip kao BOSS_QUEST_TITLE u QuestsService, cist prikazni tekst).
 * Switch (ne Record indexing) je namerno - exhaustive check bez
 * `noUncheckedIndexedAccess` "possibly undefined" upozorenja na computed access.
 */
function getAchievementNotificationContent(achievementId: AchievementId): AchievementNotificationContent {
  switch (achievementId) {
    case "FIRST_WORKOUT":
      return { title: "Prvi trening!", body: "Otkljucao si 'Prvi korak' - pocetak tvog puta." };
    case "WORKOUTS_10":
      return { title: "10 treninga!", body: "Otkljucao si 'Posvecenik' - 10 zavrsenih treninga." };
    case "WORKOUTS_50":
      return { title: "50 treninga!", body: "Otkljucao si 'Ratnik' - 50 zavrsenih treninga." };
    case "WORKOUTS_100":
      return { title: "100 treninga!", body: "Otkljucao si 'Legenda' - 100 zavrsenih treninga." };
    case "STREAK_3":
      return { title: "3 dana zaredom!", body: "Otkljucao si 'Na pravom putu' - 3-dnevni niz." };
    case "STREAK_7":
      return { title: "7 dana zaredom!", body: "Otkljucao si 'Nedelja discipline' - 7-dnevni niz." };
    case "STREAK_30":
      return { title: "30 dana zaredom!", body: "Otkljucao si 'Neumoljiv' - 30-dnevni niz." };
    case "LEVEL_5":
      return { title: "Nivo 5!", body: "Otkljucao si 'Uspon' - dostigao si nivo 5." };
    case "LEVEL_10":
      return { title: "Nivo 10!", body: "Otkljucao si 'Veteran' - dostigao si nivo 10." };
    case "LEVEL_20":
      return { title: "Nivo 20!", body: "Otkljucao si 'Sampion' - dostigao si nivo 20." };
    case "DAILY_QUESTS_10":
      return { title: "10 dnevnih questova!", body: "Otkljucao si 'Redovnost' - 10 zavrsenih dnevnih questova." };
    case "DAILY_QUESTS_50":
      return { title: "50 dnevnih questova!", body: "Otkljucao si 'Rutina' - 50 zavrsenih dnevnih questova." };
    case "BOSS_QUEST_FIRST":
      return { title: "Prvi Boss pobedjen!", body: "Otkljucao si 'Lovac na bosseve' - prva pobeda nad Boss Quest-om." };
    case "BOSS_QUEST_10":
      return { title: "10 bosseva pobedjeno!", body: "Otkljucao si 'Ubica bosseva' - 10 pobeda nad Boss Quest-om." };
    case "NUTRITION_FIRST":
      return { title: "Prvi obrok zabelezen!", body: "Otkljucao si 'Svestan ishrane' - prvi unos u dnevnik ishrane." };
    case "NUTRITION_25":
      return { title: "25 obroka zabelezeno!", body: "Otkljucao si 'Disciplinovana ishrana' - 25 unosa u dnevnik ishrane." };
    case "AI_PLAN_FIRST":
      return { title: "Prvi AI plan!", body: "Otkljucao si 'Strateg' - generisao si svoj prvi AI trening plan." };
    case "GUILD_JOIN":
      return { title: "Pridruzio si se cehu!", body: "Otkljucao si 'Timski igrac' - postao si clan ceha." };
    default:
      return assertNever(achievementId, "Nepoznat achievementId");
  }
}

/**
 * Achievements/badges - vidi packages/domain/src/achievements za katalog i
 * pravila otkljucavanja. `evaluateAndUnlock` racuna svez snapshot iz
 * postojecih tabela (XpEvent/NutritionEntry/TrainingPlan/GuildMembership -
 * NEMA posebnih "counter" kolona koje bi mogle da odu iz sinhronizacije) i
 * perzistira samo novo otkljucane - poziva se POSLE relevantnih dogadjaja
 * (workout complete, nutrition log, AI plan generisan, guild join).
 */
@Injectable()
export class AchievementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async computeSnapshot(userId: string, db: Db): Promise<AchievementStatsSnapshot> {
    const [progression, workoutsCompleted, dailyQuestsCompleted, bossQuestsCompleted, nutritionEntriesLogged, trainingPlansGenerated, membership] =
      await Promise.all([
        db.progression.findUniqueOrThrow({ where: { userId } }),
        db.xpEvent.count({ where: { userId, source: "WORKOUT_COMPLETE" } }),
        db.xpEvent.count({ where: { userId, source: "DAILY_QUEST_COMPLETE" } }),
        db.xpEvent.count({ where: { userId, source: "BOSS_QUEST_COMPLETE" } }),
        db.nutritionEntry.count({ where: { userId } }),
        db.trainingPlan.count({ where: { userId } }),
        db.guildMembership.findUnique({ where: { userId } }),
      ]);

    return {
      workoutsCompleted,
      currentStreak: progression.currentStreak,
      level: calculateLevel(progression.totalXp),
      dailyQuestsCompleted,
      bossQuestsCompleted,
      nutritionEntriesLogged,
      trainingPlansGenerated,
      guildJoined: membership !== null,
    };
  }

  /**
   * Vraca ID-jeve novo otkljucanih achievement-a (prazan niz ako nema
   * novih) - pozivalac odlucuje da li salje push notifikaciju za njih.
   * `createMany` + `skipDuplicates` je race-safe ako se ista evaluacija
   * pokrene paralelno (npr. dupli tap na "zavrsi trening").
   */
  async evaluateAndUnlock(userId: string, db: Db = this.prisma): Promise<AchievementId[]> {
    const [snapshot, unlockedRows] = await Promise.all([
      this.computeSnapshot(userId, db),
      db.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    ]);

    const alreadyUnlocked = new Set(unlockedRows.map((row) => row.achievementId as AchievementId));
    const newlyUnlocked = evaluateNewlyUnlockedAchievements(snapshot, alreadyUnlocked);
    if (newlyUnlocked.length === 0) {
      return [];
    }

    await db.userAchievement.createMany({
      data: newlyUnlocked.map((achievementId) => ({ userId, achievementId })),
      skipDuplicates: true,
    });

    return newlyUnlocked;
  }

  /**
   * Salje po jednu push notifikaciju za svaki novo otkljucan achievement -
   * pozivalac MORA da ovo zove POSLE glavne transakcije/response-a (fire-and-
   * forget, isti princip kao ostali push trigeri - vidi WorkoutsService).
   */
  async notifyNewlyUnlocked(userId: string, achievementIds: AchievementId[]): Promise<void> {
    for (const achievementId of achievementIds) {
      const content = getAchievementNotificationContent(achievementId);
      await this.notificationsService.sendToUser(userId, {
        title: content.title,
        body: content.body,
        data: { screen: "/achievements" },
      });
    }
  }

  /** GET /achievements - prvo "sustize" propustene retroaktivne unlock-ove (lazy, isti princip kao penalty provera), pa vraca ceo katalog. */
  async listForUser(userId: string): Promise<AchievementDto[]> {
    await this.evaluateAndUnlock(userId);

    const unlockedRows = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });
    const unlockedByAchievementId = new Map(unlockedRows.map((row) => [row.achievementId, row.unlockedAt]));

    return ACHIEVEMENT_DEFINITIONS.map((definition) => {
      const unlockedAt = unlockedByAchievementId.get(definition.id) ?? null;
      return {
        id: definition.id,
        category: definition.category,
        unlocked: unlockedAt !== null,
        unlockedAt: unlockedAt !== null ? unlockedAt.toISOString() : null,
      };
    });
  }
}
