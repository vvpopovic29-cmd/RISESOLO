/**
 * Penalty System - ako dnevni quest ostane nezavrsen do kraja dana, igrac
 * gubi coins kao podsticaj za konzistentnost (ogledalo Boss Quest-a, koji
 * nagradjuje konzistentnost). Namerno NE diramo total_xp (level ne sme da
 * "padne" - videti xp.ts) niti stat poene - kazna je ogranicena na coins,
 * nikad ispod 0.
 */
export const PENALTY_COINS_MISSED_DAILY_QUEST = 20;

export function calculatePenaltyCoins(missedQuestCount: number): number {
  return missedQuestCount * PENALTY_COINS_MISSED_DAILY_QUEST;
}

/** Coins nikad ne idu ispod 0 - kazna se ogranicava na trenutno stanje. */
export function applyCoinPenalty(currentCoins: number, penaltyCoins: number): number {
  return Math.max(0, currentCoins - penaltyCoins);
}
