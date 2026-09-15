/**
 * Quest lifecycle je server-authoritative: klijent nikad ne prelazi quest u
 * COMPLETED slanjem `{ completed: true }` - backend proverava uslov (vidi
 * completion engine u apps/api) pre nego sto promeni status.
 */
export const QUEST_STATUSES = ["AVAILABLE", "IN_PROGRESS", "COMPLETED", "EXPIRED"] as const;
export type QuestStatus = (typeof QUEST_STATUSES)[number];

const ALLOWED_TRANSITIONS: Readonly<Record<QuestStatus, ReadonlyArray<QuestStatus>>> = {
  AVAILABLE: ["IN_PROGRESS", "COMPLETED", "EXPIRED"],
  IN_PROGRESS: ["COMPLETED", "EXPIRED"],
  COMPLETED: [],
  EXPIRED: [],
};

export function canTransitionQuestStatus(from: QuestStatus, to: QuestStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
