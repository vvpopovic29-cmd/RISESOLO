/**
 * Achievements/Badges - trajni milestone-ovi (jednom otkljucan, zauvek
 * ostaje otkljucan) izvedeni iz iste "derive, don't cache" filozofije kao
 * total_xp/level: server nikad ne pamti "level 10 badge" kao proizvoljan
 * boolean koji moze da zaostane - umesto toga, u trenutku svakog relevantnog
 * dogadjaja (workout completion, nutrition log, guild join...) racuna se
 * svez `AchievementStatsSnapshot` i poredi sa pragovima ovde definisanim.
 * Jednom otkljucano ostaje otkljucano cak i ako se osnovna statistika
 * kasnije smanji (npr. currentStreak resetuje na 0 posle STREAK_3 badge-a).
 */

export const ACHIEVEMENT_CATEGORIES = [
  "WORKOUTS",
  "STREAK",
  "LEVEL",
  "QUESTS",
  "NUTRITION",
  "TRAINING_PLAN",
  "GUILD",
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface AchievementStatsSnapshot {
  workoutsCompleted: number;
  currentStreak: number;
  level: number;
  dailyQuestsCompleted: number;
  bossQuestsCompleted: number;
  nutritionEntriesLogged: number;
  trainingPlansGenerated: number;
  guildJoined: boolean;
}

/** Eksplicitno navedeno (ne izvedeno iz niza definicija) da bi `AchievementId` ostao literal union - potreban za exhaustive `switch` u apps/api (npr. push notifikacija po achievement-u). */
export const ACHIEVEMENT_IDS = [
  "FIRST_WORKOUT",
  "WORKOUTS_10",
  "WORKOUTS_50",
  "WORKOUTS_100",
  "STREAK_3",
  "STREAK_7",
  "STREAK_30",
  "LEVEL_5",
  "LEVEL_10",
  "LEVEL_20",
  "DAILY_QUESTS_10",
  "DAILY_QUESTS_50",
  "BOSS_QUEST_FIRST",
  "BOSS_QUEST_10",
  "NUTRITION_FIRST",
  "NUTRITION_25",
  "AI_PLAN_FIRST",
  "GUILD_JOIN",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface AchievementDefinition {
  id: AchievementId;
  category: AchievementCategory;
  isMet: (snapshot: AchievementStatsSnapshot) => boolean;
}

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  { id: "FIRST_WORKOUT", category: "WORKOUTS", isMet: (s) => s.workoutsCompleted >= 1 },
  { id: "WORKOUTS_10", category: "WORKOUTS", isMet: (s) => s.workoutsCompleted >= 10 },
  { id: "WORKOUTS_50", category: "WORKOUTS", isMet: (s) => s.workoutsCompleted >= 50 },
  { id: "WORKOUTS_100", category: "WORKOUTS", isMet: (s) => s.workoutsCompleted >= 100 },

  { id: "STREAK_3", category: "STREAK", isMet: (s) => s.currentStreak >= 3 },
  { id: "STREAK_7", category: "STREAK", isMet: (s) => s.currentStreak >= 7 },
  { id: "STREAK_30", category: "STREAK", isMet: (s) => s.currentStreak >= 30 },

  { id: "LEVEL_5", category: "LEVEL", isMet: (s) => s.level >= 5 },
  { id: "LEVEL_10", category: "LEVEL", isMet: (s) => s.level >= 10 },
  { id: "LEVEL_20", category: "LEVEL", isMet: (s) => s.level >= 20 },

  { id: "DAILY_QUESTS_10", category: "QUESTS", isMet: (s) => s.dailyQuestsCompleted >= 10 },
  { id: "DAILY_QUESTS_50", category: "QUESTS", isMet: (s) => s.dailyQuestsCompleted >= 50 },
  { id: "BOSS_QUEST_FIRST", category: "QUESTS", isMet: (s) => s.bossQuestsCompleted >= 1 },
  { id: "BOSS_QUEST_10", category: "QUESTS", isMet: (s) => s.bossQuestsCompleted >= 10 },

  { id: "NUTRITION_FIRST", category: "NUTRITION", isMet: (s) => s.nutritionEntriesLogged >= 1 },
  { id: "NUTRITION_25", category: "NUTRITION", isMet: (s) => s.nutritionEntriesLogged >= 25 },

  { id: "AI_PLAN_FIRST", category: "TRAINING_PLAN", isMet: (s) => s.trainingPlansGenerated >= 1 },

  { id: "GUILD_JOIN", category: "GUILD", isMet: (s) => s.guildJoined },
];

/**
 * Vraca ID-jeve achievement-a ciji je uslov ispunjen u datom snapshot-u a
 * korisnik ih jos nema u `alreadyUnlocked` - poziva se posle svakog
 * relevantnog dogadjaja, a servisni sloj perzistira samo novo otkljucane.
 */
export function evaluateNewlyUnlockedAchievements(
  snapshot: AchievementStatsSnapshot,
  alreadyUnlocked: ReadonlySet<AchievementId>,
): AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (definition) => !alreadyUnlocked.has(definition.id) && definition.isMet(snapshot),
  ).map((definition) => definition.id);
}
