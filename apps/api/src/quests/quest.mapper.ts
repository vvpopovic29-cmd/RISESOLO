import type { QuestResponse } from "@risesolo/validation";
import type { QuestRecord } from "./quest.entity";

export function toQuestResponse(quest: QuestRecord): QuestResponse {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description,
    xpReward: quest.xpReward,
    goldReward: quest.goldReward,
    status: quest.status,
    createdAt: quest.createdAt,
    completedAt: quest.completedAt,
  };
}
