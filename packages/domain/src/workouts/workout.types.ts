/**
 * Tipovi za Workout model (Faza 5 - WORKOUT).
 *
 * WORKOUT (template, opciono - reusable plan) -> WORKOUT SESSION (jedno
 * izvrsenje od strane korisnika) -> EXERCISES -> SETS. Template i Session
 * su namerno odvojeni tipovi: isti template moze biti izvrsen vise puta
 * (vise session-a), i korisnik moze zapoceti session i bez templatea
 * (freeform trening).
 */

export type WorkoutSessionStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

/**
 * Jedna serija. Namerno JEDAN oblik za calisthenics i gym (umesto dva tipa) -
 * calisthenics koristi reps/duration/assistance, gym koristi weight/reps,
 * polja koja se ne koriste ostaju null.
 */
export interface WorkoutSet {
  readonly id: string;
  readonly setNumber: number;
  readonly reps: number | null;
  readonly weight: number | null;
  readonly durationSeconds: number | null;
  readonly assistance: string | null;
  readonly completed: boolean;
}

export interface WorkoutSetInput {
  readonly reps?: number | null;
  readonly weight?: number | null;
  readonly durationSeconds?: number | null;
  readonly assistance?: string | null;
  readonly completed: boolean;
}

export interface WorkoutSessionExercise {
  readonly exerciseId: string;
  readonly order: number;
  readonly sets: readonly WorkoutSet[];
}

export interface WorkoutSession {
  readonly id: string;
  readonly userId: string;
  /** null = freeform session, bez templatea. */
  readonly workoutTemplateId: string | null;
  readonly status: WorkoutSessionStatus;
  readonly exercises: readonly WorkoutSessionExercise[];
  readonly startedAt: string;
  readonly completedAt: string | null;
}

export interface WorkoutTemplateExercise {
  readonly exerciseId: string;
  readonly order: number;
  readonly targetSets: number;
  readonly targetReps: string | null;
  readonly targetDurationSeconds: number | null;
  readonly restSeconds: number;
}

/** Reusable plan (nije vezan za jedno izvrsenje) - `userId: null` = sistemski/default template. */
export interface WorkoutTemplate {
  readonly id: string;
  readonly userId: string | null;
  readonly name: string;
  readonly description: string;
  readonly exercises: readonly WorkoutTemplateExercise[];
  readonly createdAt: string;
}

export interface WorkoutSessionSummary {
  readonly exerciseCount: number;
  readonly totalSets: number;
  readonly completedSets: number;
  readonly totalReps: number;
  readonly totalVolumeKg: number;
  readonly totalDurationSeconds: number;
  /** Samo kada je session COMPLETED (elapsed vreme od startedAt do completedAt). */
  readonly durationMinutes: number | null;
}
