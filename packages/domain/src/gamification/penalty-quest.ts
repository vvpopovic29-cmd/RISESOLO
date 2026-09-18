/**
 * Penalty Quest = "iskupljenje" - za razliku od Penalty System-a (penalty.ts,
 * koji samo oduzima coins kada je dnevni quest propusten), ovaj quest daje
 * igracu NACIN da povrati izgubljene coins: kada se kazna primeni, generise
 * se Penalty Quest za ISTI dan koji zahteva vise truda od obicnog dnevnog
 * questa (2 zavrsena treninga tog dana umesto 1) - zavrsetak vraca TACAN
 * iznos izgubljenih coins-a (vidi QuestsService.generatePenaltyQuest), plus
 * mali fiksni XP bonus. Progres se racuna isto kao Boss Quest (prebrojavanje
 * zavrsenih WorkoutSession), samo po danu umesto po ISO nedelji.
 */
export const PENALTY_QUEST_KIND = "REDEMPTION_WORKOUT" as const;
export type PenaltyQuestKind = typeof PENALTY_QUEST_KIND;
export const PENALTY_QUEST_KINDS = [PENALTY_QUEST_KIND] as const;

export const PENALTY_QUEST_TARGET_SESSIONS = 2;

export function isPenaltyQuestComplete(completedSessionsToday: number, target: number): boolean {
  return completedSessionsToday >= target;
}
