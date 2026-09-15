import type { Profile } from "@risesolo/validation";
import type { PlayerStats, Rank } from "@risesolo/domain";

export interface PlayerSummary {
  readonly profile: Profile;
  readonly stats: PlayerStats;
  readonly progression: {
    readonly totalXp: number;
    readonly level: number;
    readonly currentLevelXp: number;
    readonly requiredXp: number;
    readonly progressRatio: number;
    readonly rank: Rank;
    readonly coins: number;
    readonly streak: {
      readonly current: number;
      readonly longest: number;
    };
  };
}
