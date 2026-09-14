/**
 * Stat pravila (Faza 1 - STAT RULES).
 *
 * Odluka za MVP (opcija C iz plana): LEVEL UP -> STAT POINTS -> igrac sam
 * raspodeljuje poene na STR/AGI/END/VIT/INT. Trening NE menja statove
 * direktno - trening daje XP, XP daje Level, Level daje stat poene.
 * Ovo sprecava da nasumican trening menja statistiku i daje "citaljiv"
 * RPG osecaj (igrac svesno gradi svog lika).
 */
import { ok, err, type Result } from "../kernel/result";

export type StatKey = "STRENGTH" | "AGILITY" | "ENDURANCE" | "VITALITY" | "INTELLIGENCE";

export const STAT_KEYS: readonly StatKey[] = [
  "STRENGTH",
  "AGILITY",
  "ENDURANCE",
  "VITALITY",
  "INTELLIGENCE",
];

/** Pocetna vrednost svakog stata za novog igraca (Level 1). */
export const STARTING_STAT_VALUE = 5;

/** Koliko stat poena igrac dobija PO nivou (konstanta dok se ne dokaze potreba za skaliranjem). */
export const STAT_POINTS_PER_LEVEL = 3;

export interface PlayerStats {
  readonly strength: number;
  readonly agility: number;
  readonly endurance: number;
  readonly vitality: number;
  readonly intelligence: number;
  /** Poeni dodeljeni level-upovima koje igrac JOS NIJE rasporedio. */
  readonly unspentPoints: number;
}

const STAT_KEY_TO_FIELD: Record<StatKey, keyof Omit<PlayerStats, "unspentPoints">> = {
  STRENGTH: "strength",
  AGILITY: "agility",
  ENDURANCE: "endurance",
  VITALITY: "vitality",
  INTELLIGENCE: "intelligence",
};

export function createInitialStats(): PlayerStats {
  return {
    strength: STARTING_STAT_VALUE,
    agility: STARTING_STAT_VALUE,
    endurance: STARTING_STAT_VALUE,
    vitality: STARTING_STAT_VALUE,
    intelligence: STARTING_STAT_VALUE,
    unspentPoints: 0,
  };
}

/** Koliko stat poena level-up od `previousLevel` do `newLevel` donosi (podrzava vise nivoa odjednom). */
export function calculateStatPointsAwarded(previousLevel: number, newLevel: number): number {
  if (!Number.isInteger(previousLevel) || !Number.isInteger(newLevel) || newLevel < previousLevel) {
    throw new RangeError(
      `Neispravan opseg nivoa za obracun stat poena: ${previousLevel} -> ${newLevel}`,
    );
  }
  return (newLevel - previousLevel) * STAT_POINTS_PER_LEVEL;
}

/** Dodaje nerasporedjene poene nakon level-upa (ne raspodeljuje ih automatski). */
export function grantStatPoints(stats: PlayerStats, points: number): PlayerStats {
  if (!Number.isInteger(points) || points < 0) {
    throw new RangeError(`points mora biti ceo broj >= 0, dobijeno: ${points}`);
  }
  return { ...stats, unspentPoints: stats.unspentPoints + points };
}

export type AllocateStatPointsError =
  | { readonly reason: "INVALID_AMOUNT"; readonly amount: number }
  | {
      readonly reason: "INSUFFICIENT_POINTS";
      readonly requested: number;
      readonly available: number;
    };

/**
 * Igrac trosi `amount` nerasporedjenih poena na jedan stat. Cista, imutabilna
 * validacija - ovo je jedino mesto koje sme da menja vrednost stata.
 */
export function allocateStatPoints(
  stats: PlayerStats,
  statKey: StatKey,
  amount: number,
): Result<PlayerStats, AllocateStatPointsError> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return err({ reason: "INVALID_AMOUNT", amount });
  }
  if (amount > stats.unspentPoints) {
    return err({
      reason: "INSUFFICIENT_POINTS",
      requested: amount,
      available: stats.unspentPoints,
    });
  }
  const field = STAT_KEY_TO_FIELD[statKey];
  return ok({
    ...stats,
    [field]: stats[field] + amount,
    unspentPoints: stats.unspentPoints - amount,
  });
}

/** Zbir svih rasporedjenih poena (bez unspentPoints) - korisno za "Power Level"-style prikaze. */
export function totalAllocatedStats(stats: PlayerStats): number {
  return stats.strength + stats.agility + stats.endurance + stats.vitality + stats.intelligence;
}
