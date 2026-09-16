import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementId,
  type AchievementStatsSnapshot,
  evaluateNewlyUnlockedAchievements,
} from "./achievement";

const EMPTY_SNAPSHOT: AchievementStatsSnapshot = {
  workoutsCompleted: 0,
  currentStreak: 0,
  level: 1,
  dailyQuestsCompleted: 0,
  bossQuestsCompleted: 0,
  nutritionEntriesLogged: 0,
  trainingPlansGenerated: 0,
  guildJoined: false,
};

describe("ACHIEVEMENT_DEFINITIONS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("evaluateNewlyUnlockedAchievements", () => {
  it("ne vraca nista za prazan snapshot", () => {
    expect(evaluateNewlyUnlockedAchievements(EMPTY_SNAPSHOT, new Set())).toEqual([]);
  });

  it("vraca sve ispunjene achievement-e koji jos nisu otkljucani", () => {
    const snapshot: AchievementStatsSnapshot = { ...EMPTY_SNAPSHOT, workoutsCompleted: 10, currentStreak: 3 };
    const unlocked = evaluateNewlyUnlockedAchievements(snapshot, new Set());
    expect(unlocked).toEqual(expect.arrayContaining(["FIRST_WORKOUT", "WORKOUTS_10", "STREAK_3"]));
    expect(unlocked).not.toContain("WORKOUTS_50");
  });

  it("preskace achievement-e koji su vec u alreadyUnlocked", () => {
    const snapshot: AchievementStatsSnapshot = { ...EMPTY_SNAPSHOT, workoutsCompleted: 1 };
    const alreadyUnlocked = new Set<AchievementId>(["FIRST_WORKOUT"]);
    expect(evaluateNewlyUnlockedAchievements(snapshot, alreadyUnlocked)).toEqual([]);
  });

  it("otkljucava GUILD_JOIN samo kada je guildJoined true", () => {
    expect(evaluateNewlyUnlockedAchievements(EMPTY_SNAPSHOT, new Set())).not.toContain("GUILD_JOIN");
    const snapshot: AchievementStatsSnapshot = { ...EMPTY_SNAPSHOT, guildJoined: true };
    expect(evaluateNewlyUnlockedAchievements(snapshot, new Set())).toContain("GUILD_JOIN");
  });

  it("ostaje otkljucano i ako statistika kasnije padne ispod praga (alreadyUnlocked filter)", () => {
    const snapshot: AchievementStatsSnapshot = { ...EMPTY_SNAPSHOT, currentStreak: 0 };
    const alreadyUnlocked = new Set<AchievementId>(["STREAK_3"]);
    expect(evaluateNewlyUnlockedAchievements(snapshot, alreadyUnlocked)).toEqual([]);
  });
});
