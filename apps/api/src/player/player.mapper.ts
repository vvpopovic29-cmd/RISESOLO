import {
  levelFromTotalXp,
  rankForLevel,
  xpIntoCurrentLevel,
  xpRequiredForLevel,
  type PlayerGameState,
} from "@risesolo/domain";
import type { PlayerProfileResponse } from "@risesolo/validation";

export function toPlayerProfileResponse(
  userId: string,
  state: PlayerGameState,
): PlayerProfileResponse {
  const level = levelFromTotalXp(state.totalXp);

  return {
    userId,
    level,
    rank: rankForLevel(level),
    totalXp: state.totalXp,
    xpIntoLevel: xpIntoCurrentLevel(state.totalXp),
    xpRequiredForLevel: xpRequiredForLevel(level),
    gold: state.gold,
    unallocatedStatPoints: state.unallocatedStatPoints,
    stats: state.stats,
  };
}
