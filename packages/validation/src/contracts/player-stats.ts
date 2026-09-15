import { z } from "zod";

/** Runtime ugovor za `public.player_stats` red (Faza 1/2). Mapira se na @risesolo/domain PlayerStats. */
export const playerStatsRowSchema = z.object({
  user_id: z.string().uuid(),
  strength: z.number().int().nonnegative(),
  agility: z.number().int().nonnegative(),
  endurance: z.number().int().nonnegative(),
  vitality: z.number().int().nonnegative(),
  intelligence: z.number().int().nonnegative(),
  unspent_points: z.number().int().nonnegative(),
  updated_at: z.string(),
});

export type PlayerStatsRow = z.infer<typeof playerStatsRowSchema>;
