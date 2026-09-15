import { z } from "zod";

/**
 * Runtime ugovor za `public.progression` red (Faza 1/2). `total_xp` je
 * source of truth - `level`/`rank` NISU kolone, racunaju se u apps/api
 * (calculateLevel/calculateRank iz @risesolo/domain).
 */
export const progressionRowSchema = z.object({
  user_id: z.string().uuid(),
  total_xp: z.number().int().nonnegative(),
  coins: z.number().int().nonnegative(),
  current_streak: z.number().int().nonnegative(),
  longest_streak: z.number().int().nonnegative(),
  last_activity_date: z.string().nullable(),
  updated_at: z.string(),
});

export type ProgressionRow = z.infer<typeof progressionRowSchema>;
