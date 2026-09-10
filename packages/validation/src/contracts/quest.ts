import { z } from "zod";
import { playerProfileResponseSchema, rankSchema } from "./player";

export const questStatusSchema = z.enum(["active", "completed"]);
export type QuestStatusDto = z.infer<typeof questStatusSchema>;

export const createQuestRequestSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  xpReward: z.number().int().positive().max(100000),
  goldReward: z.number().int().nonnegative().max(100000),
});
export type CreateQuestRequest = z.infer<typeof createQuestRequestSchema>;

export const questResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  xpReward: z.number().int(),
  goldReward: z.number().int(),
  status: questStatusSchema,
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type QuestResponse = z.infer<typeof questResponseSchema>;

export const completeQuestResponseSchema = z.object({
  quest: questResponseSchema,
  player: playerProfileResponseSchema,
  leveledUp: z.boolean(),
  levelsGained: z.number().int().nonnegative(),
  previousRank: rankSchema,
  newRank: rankSchema,
});
export type CompleteQuestResponse = z.infer<typeof completeQuestResponseSchema>;
