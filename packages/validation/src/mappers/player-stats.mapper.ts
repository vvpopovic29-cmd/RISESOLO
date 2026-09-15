import type { PlayerStats } from "@risesolo/domain";
import type { PlayerStatsRow } from "../contracts/player-stats";

export function mapPlayerStatsRowToDomain(row: PlayerStatsRow): PlayerStats {
  return {
    strength: row.strength,
    agility: row.agility,
    endurance: row.endurance,
    vitality: row.vitality,
    intelligence: row.intelligence,
    unspentPoints: row.unspent_points,
  };
}
