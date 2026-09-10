/**
 * Hunter Rank - izvedeno iskljucivo iz nivoa (nema sopstveno stanje). Pragovi
 * su namerno siroki (10 nivoa po rangu) da rang-up bude redak, znacajan
 * dogadjaj u progresiji igraca.
 */
export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

const RANK_LEVEL_THRESHOLD = 10;

export function rankForLevel(level: number): Rank {
  const rankIndex = Math.min(Math.floor(level / RANK_LEVEL_THRESHOLD), RANKS.length - 1);
  return RANKS[Math.max(rankIndex, 0)] as Rank;
}
