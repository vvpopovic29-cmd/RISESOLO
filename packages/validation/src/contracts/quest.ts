import { z } from "zod";

/** Runtime ugovor za `public.quests` red (Faza 3) - mapira se na @risesolo/domain DailyQuest. */
export const questRowSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().uuid(),
  date: z.string(),
  definition_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  target_value: z.number().int().positive(),
  unit: z.string().min(1),
  progress_value: z.number().int().nonnegative(),
  status: z.enum(["AVAILABLE", "IN_PROGRESS", "COMPLETED", "EXPIRED"]),
  reward_xp: z.number().int().nonnegative(),
  created_at: z.string(),
  expires_at: z.string(),
  completed_at: z.string().nullable(),
});

export type QuestRow = z.infer<typeof questRowSchema>;

/** Payload za insert kada resolveDailyQuest() generise nov quest (Faza 3). */
export const questInsertSchema = questRowSchema;
export type QuestInsert = z.infer<typeof questInsertSchema>;
