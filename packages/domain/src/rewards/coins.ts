/**
 * Coins (Faza 8 - REWARDS, MINIMALNI PREVIEW).
 *
 * Ovo NIJE puna Faza 8 (shop, items, titles, boosters) - to je namerno
 * odlozeno. Ovo je samo deterministicko pravilo "koliko coina nosi X XP-a"
 * koje je Fazi 6 (Completion Engine) potrebno DA BI uopste mogla da vrati
 * `coins_gained`/`coins` iz svog odgovora (deo je originalne specifikacije
 * Completion Engine-a). Promeni SAMO ovaj odnos kad se puna ekonomija
 * definise.
 */
export const COINS_PER_XP = 5;

export function calculateCoinsForXp(xpGained: number): number {
  if (!Number.isInteger(xpGained) || xpGained < 0) {
    throw new RangeError(`xpGained mora biti ceo broj >= 0, dobijeno: ${xpGained}`);
  }
  return Math.floor(xpGained / COINS_PER_XP);
}
