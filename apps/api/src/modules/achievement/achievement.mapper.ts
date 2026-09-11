import type { AchievementResponse } from "@risesolo/validation";
import type { AchievementRow } from "./achievement.types";

export function mapAchievementRowToResponse(
  row: AchievementRow,
  unlockedAt: string | null,
): AchievementResponse {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    category: row.category,
    requirementType: row.requirement_type,
    requirementValue: row.requirement_value,
    xpReward: row.xp_reward,
    coinReward: row.coin_reward,
    unlocked: unlockedAt !== null,
    unlockedAt,
  };
}
