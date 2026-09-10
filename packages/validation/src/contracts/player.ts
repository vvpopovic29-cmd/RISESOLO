import { z } from "zod";

export const rankSchema = z.enum(["E", "D", "C", "B", "A", "S"]);
export type RankDto = z.infer<typeof rankSchema>;

export const statKeySchema = z.enum(["strength", "agility", "endurance", "vitality"]);
export type StatKeyDto = z.infer<typeof statKeySchema>;

export const playerStatsSchema = z.object({
  strength: z.number().int().nonnegative(),
  agility: z.number().int().nonnegative(),
  endurance: z.number().int().nonnegative(),
  vitality: z.number().int().nonnegative(),
});
export type PlayerStatsDto = z.infer<typeof playerStatsSchema>;

export const playerProfileResponseSchema = z.object({
  userId: z.string().uuid(),
  level: z.number().int().positive(),
  rank: rankSchema,
  totalXp: z.number().int().nonnegative(),
  xpIntoLevel: z.number().int().nonnegative(),
  xpRequiredForLevel: z.number().int().positive(),
  gold: z.number().int().nonnegative(),
  unallocatedStatPoints: z.number().int().nonnegative(),
  stats: playerStatsSchema,
});
export type PlayerProfileResponse = z.infer<typeof playerProfileResponseSchema>;

export const allocateStatRequestSchema = z.object({
  stat: statKeySchema,
  points: z.number().int().positive().max(999),
});
export type AllocateStatRequest = z.infer<typeof allocateStatRequestSchema>;
