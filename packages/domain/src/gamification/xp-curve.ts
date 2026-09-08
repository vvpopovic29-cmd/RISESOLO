/**
 * Deterministicka XP kriva. Namerno linearna (a ne eksponencijalna) za
 * Fazu 2 - jednostavna za balansiranje i testiranje; moze se zameniti
 * drugom formulom kasnije bez menjanja potpisa funkcija.
 *
 * xpRequiredForLevel(level) - koliko XP je potrebno da se predje IZ datog
 * nivoa u sledeci.
 */
export function xpRequiredForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

/** Ukupan (kumulativni) XP potreban da igrac DOSTIGNE dati nivo od nivoa 1. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += xpRequiredForLevel(currentLevel);
  }
  return total;
}

/** Nivo koji odgovara datom kumulativnom (ukupnom) XP-u. */
export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  let consumed = 0;
  while (consumed + xpRequiredForLevel(level) <= totalXp) {
    consumed += xpRequiredForLevel(level);
    level += 1;
  }
  return level;
}

/** XP progres unutar trenutnog nivoa (za progress-bar u UI-ju). */
export function xpIntoCurrentLevel(totalXp: number): number {
  const level = levelFromTotalXp(totalXp);
  return totalXp - totalXpForLevel(level);
}
