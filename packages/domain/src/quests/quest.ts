/**
 * Daily Quest generator + lifecycle (Faza 3 - QUEST SISTEM).
 *
 * Kljucna pravila iz plana:
 * 1. "Da li quest vec postoji? DA -> vrati postojeci, NE -> generisi novi"
 *    - resolveDailyQuest() implementira tacno to, a generateDailyQuest()
 *      je DETERMINISTICKA (seed = userId+date) tako da i bez DB provere
 *      dva paralelna zahteva za isti user+date generisu IDENTICAN quest -
 *      DB unique constraint na (user_id, date) (Faza 2) tada samo dedup-uje
 *      redove umesto da rešava race condition kroz distributed lock.
 * 2. Lifecycle je AVAILABLE -> IN_PROGRESS -> COMPLETED, ili AVAILABLE/
 *    IN_PROGRESS -> EXPIRED. Nema drugih tranzicija.
 * 3. Quest se NIKAD ne zavrsava zato sto klijent posalje `completed: true` -
 *    completeQuest() zahteva da je progressValue >= targetValue.
 * 4. Duplo "Complete" ne sme dati duplu nagradu - completeQuest() na vec
 *    COMPLETED questu vraca gresku, ne novu nagradu (idempotentno na
 *    domain nivou; DB sloj i dalje treba svoj idempotency key za XP event).
 */
import { err, ok, type Result } from "../kernel/result";
import { seededIndex } from "../kernel/hash";
import { QUEST_DEFINITIONS } from "./definitions";
import type { DailyQuest, QuestDefinition, QuestStatus } from "./quest.types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertValidDate(date: string): void {
  if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) {
    throw new RangeError(`date mora biti validan YYYY-MM-DD string, dobijeno: ${date}`);
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${label} ne sme biti prazan string`);
  }
}

function endOfUtcDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function startOfUtcDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

/** Deterministicki bira QuestDefinition za dati user+date iz kataloga. */
export function pickQuestDefinition(userId: string, date: string): QuestDefinition {
  assertNonEmpty(userId, "userId");
  assertValidDate(date);
  const index = seededIndex(`${userId}:${date}`, QUEST_DEFINITIONS.length);
  const definition = QUEST_DEFINITIONS[index];
  if (!definition) {
    throw new Error("QUEST_DEFINITIONS je prazan katalog - nema sta da se generise");
  }
  return definition;
}

/** Generise NOV Daily Quest za user+date. Cista i deterministicka funkcija. */
export function generateDailyQuest(userId: string, date: string): DailyQuest {
  const definition = pickQuestDefinition(userId, date);
  return {
    id: `daily-${userId}-${date}`,
    userId,
    date,
    definitionId: definition.id,
    title: definition.title,
    description: definition.description,
    targetValue: definition.targetValue,
    unit: definition.unit,
    progressValue: 0,
    status: "AVAILABLE",
    reward: definition.reward,
    createdAt: startOfUtcDayIso(date),
    expiresAt: endOfUtcDayIso(date),
    completedAt: null,
  };
}

/**
 * Servisni sloj (Faza 6+) treba ovo da zove: prosledi postojeci red iz baze
 * ako postoji, u suprotnom se generise (deterministicki) novi.
 */
export function resolveDailyQuest(
  userId: string,
  date: string,
  existing: DailyQuest | null,
): DailyQuest {
  return existing ?? generateDailyQuest(userId, date);
}

export type QuestTransitionError =
  | { readonly reason: "ALREADY_COMPLETED" }
  | { readonly reason: "EXPIRED" }
  | { readonly reason: "NOT_YET_EXPIRABLE"; readonly expiresAt: string; readonly now: string }
  | { readonly reason: "TARGET_NOT_MET"; readonly required: number; readonly actual: number }
  | { readonly reason: "INVALID_PROGRESS"; readonly progressValue: number };

const TERMINAL_STATUSES: readonly QuestStatus[] = ["COMPLETED", "EXPIRED"];

export function hasExpired(quest: DailyQuest, now: Date): boolean {
  return now.getTime() > Date.parse(quest.expiresAt);
}

/**
 * Azurira progres ka cilju. Ne zavrsava quest automatski (za to sluzi
 * completeQuest) - samo pomera AVAILABLE -> IN_PROGRESS cim progres > 0.
 */
export function updateQuestProgress(
  quest: DailyQuest,
  progressValue: number,
  now: Date,
): Result<DailyQuest, QuestTransitionError> {
  if (!Number.isInteger(progressValue) || progressValue < 0) {
    return err({ reason: "INVALID_PROGRESS", progressValue });
  }
  if (quest.status === "COMPLETED") {
    return err({ reason: "ALREADY_COMPLETED" });
  }
  if (quest.status === "EXPIRED" || hasExpired(quest, now)) {
    return err({ reason: "EXPIRED" });
  }
  const status: QuestStatus = progressValue > 0 ? "IN_PROGRESS" : quest.status;
  return ok({ ...quest, progressValue, status });
}

/**
 * Zavrsava quest SAMO ako je progressValue >= targetValue - backend nikad
 * ne veruje klijentovom `completed: true` flag-u.
 */
export function completeQuest(
  quest: DailyQuest,
  now: Date,
): Result<
  { readonly quest: DailyQuest; readonly reward: DailyQuest["reward"] },
  QuestTransitionError
> {
  if (quest.status === "COMPLETED") {
    return err({ reason: "ALREADY_COMPLETED" });
  }
  if (quest.status === "EXPIRED" || hasExpired(quest, now)) {
    return err({ reason: "EXPIRED" });
  }
  if (quest.progressValue < quest.targetValue) {
    return err({
      reason: "TARGET_NOT_MET",
      required: quest.targetValue,
      actual: quest.progressValue,
    });
  }
  const completed: DailyQuest = {
    ...quest,
    status: "COMPLETED",
    completedAt: now.toISOString(),
  };
  return ok({ quest: completed, reward: completed.reward });
}

/**
 * Istice quest ciji je rok prosao. Idempotentno na vec-EXPIRED (bezbedno
 * za ponovljeno pokretanje cron/batch job-a).
 */
export function expireQuest(
  quest: DailyQuest,
  now: Date,
): Result<DailyQuest, QuestTransitionError> {
  if (quest.status === "EXPIRED") {
    return ok(quest);
  }
  if (quest.status === "COMPLETED") {
    return err({ reason: "ALREADY_COMPLETED" });
  }
  if (!hasExpired(quest, now)) {
    return err({ reason: "NOT_YET_EXPIRABLE", expiresAt: quest.expiresAt, now: now.toISOString() });
  }
  return ok({ ...quest, status: "EXPIRED" });
}

export const QUEST_TERMINAL_STATUSES = TERMINAL_STATUSES;
