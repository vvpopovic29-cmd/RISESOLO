import { QUEST_STATUSES } from "@risesolo/domain";
import { z } from "zod";

export const dailyQuestSchema = z.object({
  id: z.string(),
  date: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  targetReps: z.number().int().nullable(),
  targetSets: z.number().int().nullable(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type DailyQuestDto = z.infer<typeof dailyQuestSchema>;
