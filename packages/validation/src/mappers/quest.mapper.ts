import type { DailyQuest } from "@risesolo/domain";
import type { QuestInsert, QuestRow } from "../contracts/quest";

export function mapQuestRowToDomain(row: QuestRow): DailyQuest {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    definitionId: row.definition_id,
    title: row.title,
    description: row.description,
    targetValue: row.target_value,
    unit: row.unit,
    progressValue: row.progress_value,
    status: row.status,
    reward: { xp: row.reward_xp },
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
  };
}

/** Koristi se i za insert (nov generisan quest) i za upsert (progress/status update). */
export function mapDomainQuestToRow(quest: DailyQuest): QuestInsert {
  return {
    id: quest.id,
    user_id: quest.userId,
    date: quest.date,
    definition_id: quest.definitionId,
    title: quest.title,
    description: quest.description,
    target_value: quest.targetValue,
    unit: quest.unit,
    progress_value: quest.progressValue,
    status: quest.status,
    reward_xp: quest.reward.xp,
    created_at: quest.createdAt,
    expires_at: quest.expiresAt,
    completed_at: quest.completedAt,
  };
}
