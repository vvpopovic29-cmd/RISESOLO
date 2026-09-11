import type { QuestResponse } from "@risesolo/validation";
import type { QuestRow } from "./quest.types";

export function mapQuestRowToResponse(row: QuestRow): QuestResponse {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    linkedAction: row.linked_action,
    targetCount: row.target_count,
    progressCount: row.progress_count,
    xpReward: row.xp_reward,
    coinReward: row.coin_reward,
    status: row.status,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    targetRank: row.target_rank,
  };
}
