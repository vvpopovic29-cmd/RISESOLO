import { DAILY_QUEST_KINDS, MAIN_QUEST_KINDS, QUEST_STATUSES, WEEKLY_QUEST_KINDS } from "@risesolo/domain";
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

/**
 * Nedeljni quest - ODVOJEN od Boss Quest-a (koji je iskljucivo "N zavrsenih
 * treninga ove nedelje"). `progress`/`targetProgress` znacenje zavisi od
 * `kind` (osvojen XP ili broj razlicitih dana sa unosom ishrane te nedelje -
 * izvedeno na serveru, ne perzistirano posebno - vidi apps/api/src/quests).
 */
export const weeklyQuestSchema = z.object({
  id: z.string(),
  weekStart: z.string(),
  kind: z.enum(WEEKLY_QUEST_KINDS),
  title: z.string(),
  description: z.string().nullable(),
  targetProgress: z.number().int(),
  progress: z.number().int(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type WeeklyQuestDto = z.infer<typeof weeklyQuestSchema>;

/**
 * Main Quest - dugorocni LANAC (za razliku od Daily/Weekly/Boss NIKAD ne
 * istice niti se resetuje po datumu, traje dok se ne zavrsi). `kind` rotira
 * kroz stat-ove (snaga/agilnost/izdrzljivost/vitalnost/inteligencija);
 * `progress` je trenutna vrednost tog stata, `tier` raste posle svake pune
 * rotacije (izvedeno na serveru, ne perzistirano posebno - vidi
 * apps/api/src/quests/quests.service.ts).
 */
export const mainQuestSchema = z.object({
  id: z.string(),
  kind: z.enum(MAIN_QUEST_KINDS),
  tier: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  targetProgress: z.number().int(),
  progress: z.number().int(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type MainQuestDto = z.infer<typeof mainQuestSchema>;
