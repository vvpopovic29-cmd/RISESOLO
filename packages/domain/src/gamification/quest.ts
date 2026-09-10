export type QuestType = "daily" | "weekly" | "main" | "side" | "boss" | "hidden" | "penalty";
export type QuestStatus = "active" | "completed" | "failed" | "expired";

export interface QuestProgressState {
  readonly status: QuestStatus;
  readonly progressCount: number;
  readonly targetCount: number;
}

/**
 * Da li quest sme da bude oznacen kao zavrsen. Ogledalo provere u
 * fn_complete_daily_quest — koristi se na backendu da se korisniku vrati
 * jasna 4xx greska pre nego sto se uopste pozove RPC, umesto da se osloni
 * samo na bazu da odbije poziv.
 */
export function isQuestCompletable(quest: QuestProgressState): boolean {
  return quest.status === "active" && quest.progressCount >= quest.targetCount;
}
