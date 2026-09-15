import { err, ok, type Result } from "../kernel/result";

/**
 * Stat sistem za RISESOLO: trening NE menja statove direktno (to bi bilo
 * nasumicno i neproverivo). Umesto toga: LEVEL UP -> STAT POINTS -> igrac
 * sam raspodeljuje poene po atributu. Ovo daje RPG osecaj i drzi svaku
 * promenu stata pod eksplicitnom, proverljivom odlukom igraca.
 */
export const STAT_KEYS = ["strength", "agility", "endurance", "vitality", "intelligence"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type PlayerStats = Readonly<Record<StatKey, number>>;

export const BASE_PLAYER_STATS: PlayerStats = {
  strength: 1,
  agility: 1,
  endurance: 1,
  vitality: 1,
  intelligence: 1,
};

/** Broj stat poena dodeljenih igracu po svakom level-upu (bez obzira koliko levela odjednom). */
export const STAT_POINTS_PER_LEVEL = 3;

export function statPointsForLevelsGained(levelsGained: number): number {
  if (!Number.isInteger(levelsGained) || levelsGained < 0) {
    throw new RangeError(`levelsGained mora biti nenegativan ceo broj, dobijeno: ${levelsGained}`);
  }
  return levelsGained * STAT_POINTS_PER_LEVEL;
}

export type StatAllocation = Partial<Record<StatKey, number>>;

export type StatAllocationError =
  | { readonly kind: "NEGATIVE_ALLOCATION"; readonly stat: StatKey }
  | { readonly kind: "NON_INTEGER_ALLOCATION"; readonly stat: StatKey }
  | { readonly kind: "INSUFFICIENT_POINTS"; readonly requested: number; readonly available: number };

export interface StatAllocationOutcome {
  readonly stats: PlayerStats;
  readonly remainingPoints: number;
}

/**
 * Primenjuje raspodelu poena koju je igrac izabrao. Cisto validira i racuna
 * novo stanje - perzistenciju (i proveru da `availablePoints` zaista
 * odgovara serverskom stanju igraca) radi pozivalac (application/servis sloj).
 */
export function allocateStatPoints(
  currentStats: PlayerStats,
  availablePoints: number,
  allocation: StatAllocation,
): Result<StatAllocationOutcome, StatAllocationError> {
  let totalRequested = 0;

  for (const stat of STAT_KEYS) {
    const amount = allocation[stat] ?? 0;
    if (!Number.isInteger(amount)) {
      return err({ kind: "NON_INTEGER_ALLOCATION", stat });
    }
    if (amount < 0) {
      return err({ kind: "NEGATIVE_ALLOCATION", stat });
    }
    totalRequested += amount;
  }

  if (totalRequested > availablePoints) {
    return err({ kind: "INSUFFICIENT_POINTS", requested: totalRequested, available: availablePoints });
  }

  const nextStats: Record<StatKey, number> = { ...currentStats };
  for (const stat of STAT_KEYS) {
    nextStats[stat] += allocation[stat] ?? 0;
  }

  return ok({ stats: nextStats, remainingPoints: availablePoints - totalRequested });
}
