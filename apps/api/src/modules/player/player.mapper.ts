import { gamification } from "@risesolo/domain";
import type { PlayerResponse } from "@risesolo/validation";
import type { PlayerRow } from "./player.types";

/**
 * Mapira DB red u API DTO. `xpToNextLevel` se racuna na letu preko deljene
 * domain formule (packages/domain/src/gamification) umesto da se cuva u
 * bazi - tako je odgovor uvek konzistentan sa trenutnim level/xp bez rizika
 * da se izracunata kolona razdvoji od izvora istine.
 */
export function mapPlayerRowToResponse(row: PlayerRow): PlayerResponse {
  return {
    id: row.id,
    displayName: row.display_name,
    level: row.level,
    xp: row.xp,
    xpToNextLevel: gamification.xpToNextLevel({ level: row.level, xp: row.xp }),
    statPointsAvailable: row.stat_points_available,
    rank: row.rank,
    class: row.class,
    coins: row.coins,
    hp: row.hp,
    strength: row.strength,
    agility: row.agility,
    endurance: row.endurance,
    vitality: row.vitality,
    intelligence: row.intelligence,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
