/**
 * Rank je za MVP deterministicka funkcija Level-a (jednostavno i predvidljivo).
 * Kasnije moze uzimati u obzir performance/achievements/consistency, ali to
 * je van MVP obima - ovde ostaje cist derived mapping.
 */
export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

/** Donja granica (inkluzivna) levela za svaki rank, rastuce sortirano. */
const RANK_LEVEL_THRESHOLDS: ReadonlyArray<{ readonly rank: Rank; readonly minLevel: number }> = [
  { rank: "E", minLevel: 1 },
  { rank: "D", minLevel: 10 },
  { rank: "C", minLevel: 20 },
  { rank: "B", minLevel: 30 },
  { rank: "A", minLevel: 40 },
  { rank: "S", minLevel: 50 },
];

export function calculateRank(level: number): Rank {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level mora biti pozitivan ceo broj, dobijeno: ${level}`);
  }
  let currentRank: Rank = "E";
  for (const threshold of RANK_LEVEL_THRESHOLDS) {
    if (level >= threshold.minLevel) {
      currentRank = threshold.rank;
    }
  }
  return currentRank;
}
