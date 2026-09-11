import type { AchievementCategory, AchievementRequirementType } from "@risesolo/validation";

/** Videti supabase/migrations/..._achievements_system.sql. */
export interface AchievementRow {
  id: string;
  code: string;
  title: string;
  description: string;
  category: AchievementCategory;
  requirement_type: AchievementRequirementType;
  requirement_value: number;
  xp_reward: number;
  coin_reward: number;
  sort_order: number;
}

export interface PlayerAchievementRow {
  player_id: string;
  achievement_id: string;
  unlocked_at: string;
}
