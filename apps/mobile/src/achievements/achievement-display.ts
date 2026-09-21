import type { AchievementDto } from "@risesolo/validation";
import type { useI18n } from "../i18n";

export interface AchievementDisplay {
  title: string;
  description: string;
  icon: string;
}

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Prikazni tekst po achievement-u - namerno odvojeno od domain sloja (isti
 * princip kao MEAL_TYPE_LABEL u nutrition.tsx). Pragovi ovde moraju da prate
 * packages/domain/src/achievements/achievement.ts - ako se prag tamo
 * promeni, opis ovde treba rucno azurirati (nema jedinstvenog izvora za
 * prikazni tekst, samo za same pragove).
 */
export function getAchievementDisplay(id: AchievementDto["id"], t: Translate): AchievementDisplay {
  switch (id) {
    case "FIRST_WORKOUT":
      return { title: t("achievements.titleFirstWorkout"), description: t("achievements.descFirstWorkout"), icon: "🏁" };
    case "WORKOUTS_10":
      return { title: t("achievements.titleWorkouts10"), description: t("achievements.descWorkouts10"), icon: "💪" };
    case "WORKOUTS_50":
      return { title: t("achievements.titleWorkouts50"), description: t("achievements.descWorkouts50"), icon: "⚔️" };
    case "WORKOUTS_100":
      return { title: t("achievements.titleWorkouts100"), description: t("achievements.descWorkouts100"), icon: "🏆" };
    case "STREAK_3":
      return { title: t("achievements.titleStreak3"), description: t("achievements.descStreak3"), icon: "🔥" };
    case "STREAK_7":
      return { title: t("achievements.titleStreak7"), description: t("achievements.descStreak7"), icon: "🔥" };
    case "STREAK_30":
      return { title: t("achievements.titleStreak30"), description: t("achievements.descStreak30"), icon: "🔥" };
    case "LEVEL_5":
      return { title: t("achievements.titleLevel5"), description: t("achievements.descLevel5"), icon: "⭐" };
    case "LEVEL_10":
      return { title: t("achievements.titleLevel10"), description: t("achievements.descLevel10"), icon: "🌟" };
    case "LEVEL_20":
      return { title: t("achievements.titleLevel20"), description: t("achievements.descLevel20"), icon: "👑" };
    case "DAILY_QUESTS_10":
      return { title: t("achievements.titleDailyQuests10"), description: t("achievements.descDailyQuests10"), icon: "📋" };
    case "DAILY_QUESTS_50":
      return { title: t("achievements.titleDailyQuests50"), description: t("achievements.descDailyQuests50"), icon: "📋" };
    case "BOSS_QUEST_FIRST":
      return { title: t("achievements.titleBossQuestFirst"), description: t("achievements.descBossQuestFirst"), icon: "🐉" };
    case "BOSS_QUEST_10":
      return { title: t("achievements.titleBossQuest10"), description: t("achievements.descBossQuest10"), icon: "🐉" };
    case "NUTRITION_FIRST":
      return { title: t("achievements.titleNutritionFirst"), description: t("achievements.descNutritionFirst"), icon: "🍎" };
    case "NUTRITION_25":
      return { title: t("achievements.titleNutrition25"), description: t("achievements.descNutrition25"), icon: "🍎" };
    case "AI_PLAN_FIRST":
      return { title: t("achievements.titleAiPlanFirst"), description: t("achievements.descAiPlanFirst"), icon: "🧠" };
    case "GUILD_JOIN":
      return { title: t("achievements.titleGuildJoin"), description: t("achievements.descGuildJoin"), icon: "🛡️" };
  }
}
