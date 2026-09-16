/**
 * Guild Progression - deo XP-a koji igrac osvoji treningom automatski
 * doprinosi cehovskom `total_xp` (isti obrazac kao licni total_xp: jedini
 * izvor istine, level se uvek izvodi - vidi @risesolo/domain xp.ts).
 */
export const GUILD_XP_CONTRIBUTION_RATE = 0.2;

export function calculateGuildXpContribution(xpGained: number): number {
  return Math.floor(Math.max(0, xpGained) * GUILD_XP_CONTRIBUTION_RATE);
}
