/**
 * Guild Treasury & Rewards - LEADER raspodeljuje riznicu ravnomerno svim
 * clanovima; ostatak od celobrojnog deljenja ostaje u riznici (ne gubi se).
 */
export interface TreasuryDistribution {
  perMember: number;
  remainder: number;
}

export function distributeTreasury(treasuryCoins: number, memberCount: number): TreasuryDistribution {
  if (memberCount <= 0 || treasuryCoins <= 0) {
    return { perMember: 0, remainder: Math.max(0, treasuryCoins) };
  }
  const perMember = Math.floor(treasuryCoins / memberCount);
  const remainder = treasuryCoins - perMember * memberCount;
  return { perMember, remainder };
}
