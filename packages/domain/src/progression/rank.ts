/**
 * Rank pravila (Faza 1 - RANK RULES).
 *
 * Odluka za MVP: Rank = deterministicka funkcija Level-a, bez izmisljenih
 * vrednosti na UI-ju i bez uticaja performansi/achievement-a/konzistentnosti
 * (to je Faza 2+ prosirenje). E -> D -> C -> B -> A -> S; MONARCH namerno
 * IZOSTAVLJEN iz MVP-a dok se ne odluci sta ga otkljucava.
 */
export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

interface RankThreshold {
  readonly rank: Rank;
  readonly minLevel: number;
}

/** Rastuci prag po nivou - menjati SAMO ovde, nikad u UI komponentama. */
const RANK_THRESHOLDS: readonly RankThreshold[] = [
  { rank: "E", minLevel: 1 },
  { rank: "D", minLevel: 10 },
  { rank: "C", minLevel: 20 },
  { rank: "B", minLevel: 30 },
  { rank: "A", minLevel: 40 },
  { rank: "S", minLevel: 50 },
];

export function calculateRank(level: number): Rank {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level mora biti ceo broj >= 1, dobijeno: ${level}`);
  }
  let current: Rank = "E";
  for (const threshold of RANK_THRESHOLDS) {
    if (level >= threshold.minLevel) {
      current = threshold.rank;
    }
  }
  return current;
}

/** Minimalni nivo potreban za dati rank - korisno za "sledeci rank na X" UI poruke. */
export function minLevelForRank(rank: Rank): number {
  const found = RANK_THRESHOLDS.find((t) => t.rank === rank);
  if (!found) {
    throw new Error(`Nepoznat rank: ${String(rank)}`);
  }
  return found.minLevel;
}

/** Sledeci rank posle datog, ili null ako je S (trenutno najvisi u MVP-u). */
export function nextRank(rank: Rank): Rank | null {
  const index = RANK_THRESHOLDS.findIndex((t) => t.rank === rank);
  const next = RANK_THRESHOLDS[index + 1];
  return next ? next.rank : null;
}
