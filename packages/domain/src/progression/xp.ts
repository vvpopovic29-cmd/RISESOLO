/**
 * XP / Level pravila - JEDINI izvor istine za obracun iskustva i nivoa
 * (Faza 1 - XP RULES). Nijedan ekran ili API handler ne sme racunati
 * XP/Level samostalno - uvek kroz ove funkcije.
 *
 * Formula (zadata): XP required (za sledeci nivo) = Level^2 * 100.
 * Ukupan (kumulativni) XP prag da bi igrac BIO na nivou L racuna se kao
 * zbir svih pragova za nivoe 1..L-1: totalXpForLevel(L) = 100 * sum(k^2, k=1..L-1).
 * Nivo 1 pocinje na 0 XP.
 */

export const BASE_LEVEL = 1;
const XP_PER_LEVEL_SQUARED = 100;

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} mora biti ceo broj >= 0, dobijeno: ${value}`);
  }
}

function assertValidLevel(level: number): void {
  if (!Number.isInteger(level) || level < BASE_LEVEL) {
    throw new RangeError(`level mora biti ceo broj >= ${BASE_LEVEL}, dobijeno: ${level}`);
  }
}

/** Zbir kvadrata 1..n (n >= 0), koristi se za kumulativni XP prag. */
function sumOfSquares(n: number): number {
  return (n * (n + 1) * (2 * n + 1)) / 6;
}

/** XP potreban da se predje SA datog nivoa NA sledeci (Level^2 * 100). */
export function calculateRequiredXp(level: number): number {
  assertValidLevel(level);
  return level * level * XP_PER_LEVEL_SQUARED;
}

/** Kumulativni total_xp prag da bi igrac BIO na datom nivou. */
export function calculateTotalXpForLevel(level: number): number {
  assertValidLevel(level);
  return XP_PER_LEVEL_SQUARED * sumOfSquares(level - 1);
}

/** Nivo igraca izveden iz total_xp (total_xp je source of truth, level je derived). */
export function calculateLevel(totalXp: number): number {
  assertNonNegativeInteger(totalXp, "totalXp");
  let level = BASE_LEVEL;
  while (totalXp >= calculateTotalXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** Koliko je XP-a igrac vec sakupio unutar TRENUTNOG nivoa (0 <= rezultat < requiredXp za taj nivo). */
export function calculateCurrentLevelXp(totalXp: number): number {
  assertNonNegativeInteger(totalXp, "totalXp");
  const level = calculateLevel(totalXp);
  return totalXp - calculateTotalXpForLevel(level);
}

export interface XpProgress {
  readonly level: number;
  readonly totalXp: number;
  /** XP sakupljen unutar trenutnog nivoa. */
  readonly currentLevelXp: number;
  /** XP potreban da se predje na sledeci nivo. */
  readonly requiredXp: number;
  /** Napredak unutar trenutnog nivoa, 0..1. */
  readonly progressRatio: number;
}

/** Agregatni prikaz napretka - ono sto UI ekrani (Player/Dashboard) treba da koriste. */
export function calculateProgress(totalXp: number): XpProgress {
  assertNonNegativeInteger(totalXp, "totalXp");
  const level = calculateLevel(totalXp);
  const currentLevelXp = calculateCurrentLevelXp(totalXp);
  const requiredXp = calculateRequiredXp(level);
  return {
    level,
    totalXp,
    currentLevelXp,
    requiredXp,
    progressRatio: requiredXp === 0 ? 0 : currentLevelXp / requiredXp,
  };
}

export interface XpGainResult {
  readonly previousTotalXp: number;
  readonly newTotalXp: number;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly leveledUp: boolean;
  readonly levelsGained: number;
  readonly progress: XpProgress;
}

/**
 * Cista funkcija koja primenjuje XP dobitak i vraca pre/posle snapshot.
 * Backend (Faza 6 - Completion Engine) treba ovo da zove NAKON sto upise
 * XP event (idempotentno, sa unique constraint na source+source_id) - ova
 * funkcija ne zna nista o duplikatima, samo racuna rezultat jedne primene.
 */
export function applyXpGain(previousTotalXp: number, xpGained: number): XpGainResult {
  assertNonNegativeInteger(previousTotalXp, "previousTotalXp");
  assertNonNegativeInteger(xpGained, "xpGained");
  const previousLevel = calculateLevel(previousTotalXp);
  const newTotalXp = previousTotalXp + xpGained;
  const newLevel = calculateLevel(newTotalXp);
  return {
    previousTotalXp,
    newTotalXp,
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
    levelsGained: newLevel - previousLevel,
    progress: calculateProgress(newTotalXp),
  };
}
