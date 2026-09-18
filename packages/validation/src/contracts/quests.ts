import {
  DAILY_QUEST_KINDS,
  MAIN_QUEST_KINDS,
  PENALTY_QUEST_KINDS,
  QUEST_STATUSES,
  SIDE_QUEST_KINDS,
  WEEKLY_QUEST_KINDS,
} from "@risesolo/domain";
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

/**
 * Side Quest - bonus izazov vezan za konkretnu sesiju treninga (MVP: samo
 * "nova vezba"). Za razliku od Boss/Weekly/Main Questa, `progress` NIJE
 * izvedeno iz posebnog upita - ili je 0 (jos nezavrseno) ili targetProgress
 * (zavrseno) jer se ovaj quest zavrsava iskljucivo unutar workout completion
 * engine-a (vidi apps/api/src/workouts/workouts.service.ts), ne lenjo na GET-u.
 */
export const sideQuestSchema = z.object({
  id: z.string(),
  kind: z.enum(SIDE_QUEST_KINDS),
  title: z.string(),
  description: z.string().nullable(),
  targetProgress: z.number().int(),
  progress: z.number().int(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type SideQuestDto = z.infer<typeof sideQuestSchema>;

/**
 * `quest: null` znaci da je korisnik iscrpeo biblioteku vezbi (zavrsio bar
 * jednu seriju svake vezbe) - nema vise "novih" vezbi da bi Side Quest mogao
 * da se generise. Odgovor je NAMERNO uvijen u objekat (nikad bare `null`) -
 * isti anti-"prazno telo" princip kao ActiveWorkoutSessionResponse.
 */
export const sideQuestResponseSchema = z.object({
  quest: sideQuestSchema.nullable(),
});
export type SideQuestResponse = z.infer<typeof sideQuestResponseSchema>;

/**
 * Penalty Quest = "iskupljenje" - postoji SAMO kada je Penalty System stvarno
 * primenio kaznu danas (vidi QuestsService.expirePastDueDailyQuests). Za
 * razliku od svih ostalih questova, `coinReward` NIJE fiksan iz kataloga -
 * jednak je tacnom iznosu izgubljenih coins-a za tu konkretnu kaznu.
 * `progress`/`targetProgress` = broj zavrsenih treninga DANAS (isti princip
 * kao Boss Quest, samo po kalendarskom danu umesto po ISO nedelji).
 */
export const penaltyQuestSchema = z.object({
  id: z.string(),
  kind: z.enum(PENALTY_QUEST_KINDS),
  title: z.string(),
  description: z.string().nullable(),
  targetProgress: z.number().int(),
  progress: z.number().int(),
  xpReward: z.number().int(),
  coinReward: z.number().int(),
  status: z.enum(QUEST_STATUSES),
});
export type PenaltyQuestDto = z.infer<typeof penaltyQuestSchema>;

/**
 * `quest: null` je NORMALNO/najcesce stanje (vecina dana nema propusten
 * dnevni quest, pa nema ni Penalty Quest-a za iskupljenje) - namerno uvijeno
 * u objekat, isti anti-"prazno telo" princip kao sideQuestResponseSchema.
 */
export const penaltyQuestResponseSchema = z.object({
  quest: penaltyQuestSchema.nullable(),
});
export type PenaltyQuestResponse = z.infer<typeof penaltyQuestResponseSchema>;
