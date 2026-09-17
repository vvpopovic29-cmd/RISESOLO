import { DAILY_QUEST_KINDS, QUEST_STATUSES } from "@risesolo/domain";
import { z } from "zod";

export const dailyQuestSchema = z.object({
  id: z.string(),
  date: z.string(),
  kind: z.enum(DAILY_QUEST_KINDS),
  title: z.string(),
  description: z.string().nullable(),
  targetReps: z.number().int().nullable(),
  targetSets: z.number().int().nullable(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type DailyQuestDto = z.infer<typeof dailyQuestSchema>;

/**
 * Nedeljni izazov - `progress`/`targetSessions` su broj zavrsenih treninga
 * ove ISO nedelje (izvedeno na serveru, ne perzistirano posebno - vidi
 * apps/api/src/quests/quests.service.ts).
 */
export const bossQuestSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  targetSessions: z.number().int(),
  progress: z.number().int(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type BossQuestDto = z.infer<typeof bossQuestSchema>;
