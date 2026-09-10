import { xpRequiredForLevel } from "./xp";

/** Stat Points dodeljeni igracu za svaki nivo koji predje u jednom XP grantu. */
export const STAT_POINTS_PER_LEVEL = 3;

export interface PlayerProgress {
  readonly level: number;
  readonly xp: number;
}

export interface XpGainResult extends PlayerProgress {
  readonly levelsGained: number;
  readonly statPointsGained: number;
}

/**
 * Cista funkcija koja primenjuje dobijeni XP na trenutni progres i vraca
 * novo stanje (level/xp nakon svih level-up-ova u ovom grantu, uz visak XP
 * prenet u novi nivo). Ogledalo je SQL petlje u fn_grant_xp — backend je
 * koristi za read-only preview (npr. "koliko XP-a nedostaje do sledeceg
 * nivoa" u API odgovoru), dok se stvarni upis u bazu i dalje desava
 * iskljucivo kroz fn_grant_xp (atomicnost pod concurrent grantovima +
 * idempotencija preko xp_transactions). Nikad se ne koristi da bi se
 * frontend vrednosti direktno upisale u bazu.
 */
export function applyXpGain(current: PlayerProgress, xpGained: number): XpGainResult {
  if (!Number.isInteger(xpGained) || xpGained <= 0) {
    throw new RangeError(`xpGained mora biti pozitivan ceo broj, dobijeno: ${xpGained}`);
  }

  let level = current.level;
  let xp = current.xp + xpGained;
  let levelsGained = 0;
  let xpToNext = xpRequiredForLevel(level);

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    levelsGained += 1;
    xpToNext = xpRequiredForLevel(level);
  }

  return {
    level,
    xp,
    levelsGained,
    statPointsGained: levelsGained * STAT_POINTS_PER_LEVEL,
  };
}

/** Koliko XP-a jos nedostaje da igrac predje na sledeci nivo. */
export function xpToNextLevel(current: PlayerProgress): number {
  return xpRequiredForLevel(current.level) - current.xp;
}
