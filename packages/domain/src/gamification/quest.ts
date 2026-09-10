import { type Result, err, ok } from "../kernel/result";

export const QUEST_STATUSES = ["active", "completed"] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

export type QuestError = { readonly type: "quest_already_completed" };

/**
 * Invarijanta: quest se moze zavrsiti tacno jednom. Cista provera prelaza
 * stanja - perzistencija i primena nagrade su odgovornost application sloja.
 */
export function completeQuest(status: QuestStatus): Result<"completed", QuestError> {
  if (status === "completed") {
    return err({ type: "quest_already_completed" });
  }

  return ok("completed");
}
