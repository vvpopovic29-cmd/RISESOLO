/**
 * XP i Level pravila. `total_xp` je jedini izvor istine (persistira se);
 * `level` se uvek izvodi iz `total_xp` preko ovih funkcija, nikad ne cuva
 * odvojeno, da ne bi dosao u nekonzistentno stanje (npr. total_xp = 5000
 * ali level ostao 6 zbog bug-a).
 *
 * Formula: XP potreban da se predje sa levela L na L+1 = L^2 * 100.
 */

/** Najveci level koji sistem racuna; sprecava beskonacnu petlju za corrupted/extreme XP vrednosti. */
const MAX_LEVEL = 200;

/** XP potreban da se predje sa `level` na `level + 1`. */
export function calculateRequiredXP(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`level mora biti pozitivan ceo broj, dobijeno: ${level}`);
  }
  return level * level * 100;
}

/** Kumulativni total_xp potreban da se DOSTIGNE dati level (level 1 = 0 XP). */
function cumulativeXpForLevel(level: number): number {
  let total = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += calculateRequiredXP(currentLevel);
  }
  return total;
}

function normalizeTotalXP(totalXP: number): number {
  if (!Number.isFinite(totalXP) || totalXP < 0) {
    throw new RangeError(`totalXP mora biti nenegativan broj, dobijeno: ${totalXP}`);
  }
  return Math.floor(totalXP);
}

/** Level koji odgovara datom total_xp (izvedena vrednost, uvek racunata iznova). */
export function calculateLevel(totalXP: number): number {
  const xp = normalizeTotalXP(totalXP);
  let level = 1;
  while (level < MAX_LEVEL && xp >= cumulativeXpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

/** XP koji je igrac osvojio unutar trenutnog levela (0 <= vrednost < calculateRequiredXP(level)). */
export function calculateCurrentLevelXP(totalXP: number): number {
  const xp = normalizeTotalXP(totalXP);
  const level = calculateLevel(xp);
  return xp - cumulativeXpForLevel(level);
}

/** Progres ka sledecem levelu kao razlomak u [0, 1). */
export function calculateProgress(totalXP: number): number {
  const level = calculateLevel(normalizeTotalXP(totalXP));
  const currentLevelXP = calculateCurrentLevelXP(totalXP);
  return currentLevelXP / calculateRequiredXP(level);
}

export interface LevelUpResult {
  readonly leveledUp: boolean;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly levelsGained: number;
}

/** Detektuje da li je dodela `xpGained` XP-a (totalXpBefore -> totalXpBefore + xpGained) izazvala level up, i koliko puta. */
export function detectLevelUp(totalXpBefore: number, xpGained: number): LevelUpResult {
  const previousLevel = calculateLevel(totalXpBefore);
  const newLevel = calculateLevel(normalizeTotalXP(totalXpBefore) + Math.max(0, Math.floor(xpGained)));
  return {
    leveledUp: newLevel > previousLevel,
    previousLevel,
    newLevel,
    levelsGained: newLevel - previousLevel,
  };
}
