import { type Result, err, ok } from "../kernel/result";
import { type Rank, rankForLevel } from "./rank";
import { type PlayerStats, type StatKey, ZERO_STATS } from "./stats";
import { levelFromTotalXp } from "./xp-curve";

/** Broj poena statistike koje igrac dobija za dodelu pri svakom level-up-u. */
export const STAT_POINTS_PER_LEVEL = 3;

export interface PlayerGameState {
  readonly totalXp: number;
  readonly gold: number;
  readonly unallocatedStatPoints: number;
  readonly stats: PlayerStats;
}

export const INITIAL_PLAYER_STATE: PlayerGameState = {
  totalXp: 0,
  gold: 0,
  unallocatedStatPoints: 0,
  stats: ZERO_STATS,
};

export interface QuestRewards {
  readonly xp: number;
  readonly gold: number;
}

export type GameEngineError =
  | { readonly type: "invalid_reward" }
  | { readonly type: "invalid_points" }
  | {
      readonly type: "insufficient_stat_points";
      readonly available: number;
      readonly requested: number;
    };

export interface RewardOutcome {
  readonly state: PlayerGameState;
  readonly leveledUp: boolean;
  readonly levelsGained: number;
  readonly previousRank: Rank;
  readonly newRank: Rank;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Primenjuje XP/gold nagradu na stanje igraca. Cista funkcija - ne zna nista
 * o questovima, bazi ili HTTP-u; poziva je application sloj (npr. Quest
 * completion use-case) posto proveri sopstvene invarijante (npr. da quest
 * jos nije zavrsen).
 */
export function applyRewards(
  state: PlayerGameState,
  reward: QuestRewards,
): Result<RewardOutcome, GameEngineError> {
  if (!isNonNegativeInteger(reward.xp) || !isNonNegativeInteger(reward.gold)) {
    return err({ type: "invalid_reward" });
  }

  const previousLevel = levelFromTotalXp(state.totalXp);
  const newTotalXp = state.totalXp + reward.xp;
  const newLevel = levelFromTotalXp(newTotalXp);
  const levelsGained = newLevel - previousLevel;

  const newState: PlayerGameState = {
    ...state,
    totalXp: newTotalXp,
    gold: state.gold + reward.gold,
    unallocatedStatPoints: state.unallocatedStatPoints + levelsGained * STAT_POINTS_PER_LEVEL,
  };

  return ok({
    state: newState,
    leveledUp: levelsGained > 0,
    levelsGained,
    previousRank: rankForLevel(previousLevel),
    newRank: rankForLevel(newLevel),
  });
}

/**
 * Trosi neraspodeljene poene statistike na jedan izabrani atribut.
 */
export function allocateStatPoint(
  state: PlayerGameState,
  statKey: StatKey,
  points: number,
): Result<PlayerGameState, GameEngineError> {
  if (!Number.isInteger(points) || points <= 0) {
    return err({ type: "invalid_points" });
  }

  if (points > state.unallocatedStatPoints) {
    return err({
      type: "insufficient_stat_points",
      available: state.unallocatedStatPoints,
      requested: points,
    });
  }

  return ok({
    ...state,
    unallocatedStatPoints: state.unallocatedStatPoints - points,
    stats: {
      ...state.stats,
      [statKey]: state.stats[statKey] + points,
    },
  });
}
