/**
 * Workout template + session lifecycle + set tracking (Faza 5 - WORKOUT).
 *
 * Kljucna pravila:
 * 1. WorkoutTemplate i WorkoutSession su odvojeni tipovi - jedan template
 *    moze biti izvrsen kroz vise session-a; session moze postojati i bez
 *    templatea (freeform trening).
 * 2. Set se moze logovati SAMO u vezbu koja je deo session-a (dodata pri
 *    startWorkoutSession) i SAMO dok je session IN_PROGRESS.
 * 3. completeWorkoutSession zahteva da postoji bar jedna zavrsena (completed)
 *    serija - prazan/nikad-otpoceti trening se ne moze "zavrsiti" (isti
 *    princip kao completeQuest u Fazi 3: backend potvrdjuje stvarni napredak).
 * 4. computeWorkoutSessionSummary je cista agregacija koju Faza 6
 *    (Completion Engine) koristi kao ulaz za XP/quest progress - ne racuna
 *    XP sama.
 */
import { err, ok, type Result } from "../kernel/result";
import type {
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSessionStatus,
  WorkoutSessionSummary,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "./workout.types";

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${label} ne sme biti prazan string`);
  }
}

function assertNonNegativeIntegerOrNull(value: number | null | undefined, label: string): void {
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} mora biti ceo broj >= 0 ili null, dobijeno: ${value}`);
  }
}

function assertNonNegativeNumberOrNull(value: number | null | undefined, label: string): void {
  if (value === null || value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} mora biti broj >= 0 ili null, dobijeno: ${value}`);
  }
}

export interface CreateWorkoutTemplateInput {
  readonly id: string;
  readonly userId: string | null;
  readonly name: string;
  readonly description: string;
  readonly exercises: ReadonlyArray<Omit<WorkoutTemplateExercise, "order">>;
  readonly now: Date;
}

/** Konstruise WorkoutTemplate, dodeljuje redosled (order) po redosledu niza. */
export function createWorkoutTemplate(input: CreateWorkoutTemplateInput): WorkoutTemplate {
  assertNonEmpty(input.id, "id");
  assertNonEmpty(input.name, "name");
  if (input.exercises.length === 0) {
    throw new RangeError("WorkoutTemplate mora imati bar jednu vezbu");
  }
  for (const exercise of input.exercises) {
    assertNonEmpty(exercise.exerciseId, "exerciseId");
    if (!Number.isInteger(exercise.targetSets) || exercise.targetSets <= 0) {
      throw new RangeError(
        `targetSets mora biti pozitivan ceo broj, dobijeno: ${exercise.targetSets}`,
      );
    }
  }
  return {
    id: input.id,
    userId: input.userId,
    name: input.name,
    description: input.description,
    exercises: input.exercises.map((exercise, index) => ({ ...exercise, order: index + 1 })),
    createdAt: input.now.toISOString(),
  };
}

export interface StartWorkoutSessionFromTemplateInput {
  readonly id: string;
  readonly userId: string;
  readonly template: WorkoutTemplate;
  readonly now: Date;
}

/** Otpocinje session iz postojeceg template-a - vezbe (bez serija) se preslikavaju iz template-a. */
export function startWorkoutSessionFromTemplate(
  input: StartWorkoutSessionFromTemplateInput,
): WorkoutSession {
  assertNonEmpty(input.id, "id");
  assertNonEmpty(input.userId, "userId");
  return {
    id: input.id,
    userId: input.userId,
    workoutTemplateId: input.template.id,
    status: "IN_PROGRESS",
    exercises: input.template.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      order: e.order,
      sets: [],
    })),
    startedAt: input.now.toISOString(),
    completedAt: null,
  };
}

export interface StartFreeformWorkoutSessionInput {
  readonly id: string;
  readonly userId: string;
  readonly exerciseIds: readonly string[];
  readonly now: Date;
}

/** Otpocinje session BEZ templatea - korisnik sam bira vezbe u letu. */
export function startFreeformWorkoutSession(
  input: StartFreeformWorkoutSessionInput,
): WorkoutSession {
  assertNonEmpty(input.id, "id");
  assertNonEmpty(input.userId, "userId");
  if (input.exerciseIds.length === 0) {
    throw new RangeError("Freeform workout session mora imati bar jednu vezbu");
  }
  return {
    id: input.id,
    userId: input.userId,
    workoutTemplateId: null,
    status: "IN_PROGRESS",
    exercises: input.exerciseIds.map((exerciseId, index) => ({
      exerciseId,
      order: index + 1,
      sets: [],
    })),
    startedAt: input.now.toISOString(),
    completedAt: null,
  };
}

export type WorkoutSessionError =
  | { readonly reason: "NOT_IN_PROGRESS"; readonly status: WorkoutSessionStatus }
  | { readonly reason: "EXERCISE_NOT_IN_SESSION"; readonly exerciseId: string }
  | { readonly reason: "ALREADY_COMPLETED" }
  | { readonly reason: "ALREADY_ABANDONED" }
  | { readonly reason: "NO_PROGRESS" };

export function getSessionExercise(
  session: WorkoutSession,
  exerciseId: string,
): WorkoutSessionExercise | undefined {
  return session.exercises.find((e) => e.exerciseId === exerciseId);
}

/**
 * Loguje ZAVRSENU (ili napustenu) seriju za vezbu koja je vec deo session-a.
 * setNumber se dodeljuje automatski (sledeci redni broj za tu vezbu).
 * Odbija log ako session nije IN_PROGRESS ili ako vezba nije deo session-a
 * (korisnik ne moze da doda proizvoljnu vezbu mimo onoga sa cim je pocelo).
 */
export function logSet(
  session: WorkoutSession,
  exerciseId: string,
  setId: string,
  input: WorkoutSetInput,
): Result<WorkoutSession, WorkoutSessionError> {
  if (session.status !== "IN_PROGRESS") {
    return err({ reason: "NOT_IN_PROGRESS", status: session.status });
  }
  const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
  if (!exercise) {
    return err({ reason: "EXERCISE_NOT_IN_SESSION", exerciseId });
  }

  assertNonEmpty(setId, "setId");
  assertNonNegativeIntegerOrNull(input.reps, "reps");
  assertNonNegativeNumberOrNull(input.weight, "weight");
  assertNonNegativeIntegerOrNull(input.durationSeconds, "durationSeconds");

  const newSet: WorkoutSet = {
    id: setId,
    setNumber: exercise.sets.length + 1,
    reps: input.reps ?? null,
    weight: input.weight ?? null,
    durationSeconds: input.durationSeconds ?? null,
    assistance: input.assistance ?? null,
    completed: input.completed,
  };

  const updatedExercises = session.exercises.map((e) =>
    e.exerciseId === exerciseId ? { ...e, sets: [...e.sets, newSet] } : e,
  );
  return ok({ ...session, exercises: updatedExercises });
}

/** Zavrsava session SAMO ako postoji bar jedna zavrsena serija (stvaran napredak, ne prazan klik). */
export function completeWorkoutSession(
  session: WorkoutSession,
  now: Date,
): Result<WorkoutSession, WorkoutSessionError> {
  if (session.status === "COMPLETED") {
    return err({ reason: "ALREADY_COMPLETED" });
  }
  if (session.status === "ABANDONED") {
    return err({ reason: "ALREADY_ABANDONED" });
  }
  const hasCompletedSet = session.exercises.some((e) => e.sets.some((s) => s.completed));
  if (!hasCompletedSet) {
    return err({ reason: "NO_PROGRESS" });
  }
  return ok({ ...session, status: "COMPLETED", completedAt: now.toISOString() });
}

/** Napusta session. Idempotentno na vec-ABANDONED; odbija napustanje vec zavrsenog session-a. */
export function abandonWorkoutSession(
  session: WorkoutSession,
  now: Date,
): Result<WorkoutSession, WorkoutSessionError> {
  if (session.status === "ABANDONED") {
    return ok(session);
  }
  if (session.status === "COMPLETED") {
    return err({ reason: "ALREADY_COMPLETED" });
  }
  return ok({ ...session, status: "ABANDONED", completedAt: now.toISOString() });
}

/**
 * Cista agregacija session-a - ulaz za Fazu 6 (Completion Engine) koji
 * odatle racuna XP/quest progress. Sama NE dodeljuje XP.
 */
export function computeWorkoutSessionSummary(session: WorkoutSession): WorkoutSessionSummary {
  let totalSets = 0;
  let completedSets = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;
  let totalDurationSeconds = 0;

  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      totalSets += 1;
      if (set.completed) completedSets += 1;
      totalReps += set.reps ?? 0;
      totalVolumeKg += (set.weight ?? 0) * (set.reps ?? 0);
      totalDurationSeconds += set.durationSeconds ?? 0;
    }
  }

  const durationMinutes =
    session.status === "COMPLETED" && session.completedAt
      ? Math.round((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 60_000)
      : null;

  return {
    exerciseCount: session.exercises.length,
    totalSets,
    completedSets,
    totalReps,
    totalVolumeKg,
    totalDurationSeconds,
    durationMinutes,
  };
}
