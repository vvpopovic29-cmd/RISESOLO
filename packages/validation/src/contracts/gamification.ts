import { z } from "zod";

/**
 * Faza 2 DTO ugovori - Player / Quest / Workout / Reward. Isti izvor
 * istine za apps/api (odgovor kontrolera + validacija request body-ja
 * preko ZodValidationPipe) i packages/api-client (buduca runtime
 * validacija na klijentu).
 *
 * Backend nikad ne prihvata XP/level/coins/statPoints direktno od
 * klijenta - ova polja se pojavljuju samo u *response* semama, nikad u
 * *input* semama.
 */

export const playerRankSchema = z.enum(["E", "D", "C", "B", "A", "S", "SS", "SSS"]);
export type PlayerRank = z.infer<typeof playerRankSchema>;

export const playerClassSchema = z.enum([
  "strength_hunter",
  "speed_hunter",
  "endurance_hunter",
  "bodybuilder",
  "calisthenics_hunter",
  "balanced_hunter",
]);
export type PlayerClass = z.infer<typeof playerClassSchema>;

export const playerStatNameSchema = z.enum([
  "strength",
  "agility",
  "endurance",
  "vitality",
  "intelligence",
]);
export type PlayerStatName = z.infer<typeof playerStatNameSchema>;

export const playerResponseSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  level: z.number().int().min(1),
  xp: z.number().int().min(0),
  xpToNextLevel: z.number().int().min(0),
  statPointsAvailable: z.number().int().min(0),
  rank: playerRankSchema,
  class: playerClassSchema.nullable(),
  coins: z.number().int().min(0),
  hp: z.number().int().min(0),
  strength: z.number().int().min(0),
  agility: z.number().int().min(0),
  endurance: z.number().int().min(0),
  vitality: z.number().int().min(0),
  intelligence: z.number().int().min(0),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActivityDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlayerResponse = z.infer<typeof playerResponseSchema>;

export const updatePlayerProfileInputSchema = z
  .object({
    displayName: z.string().trim().min(1).max(40).optional(),
    class: playerClassSchema.optional(),
  })
  .refine((value) => value.displayName !== undefined || value.class !== undefined, {
    message: "bar jedno polje (displayName ili class) mora biti prosledjeno",
  });
export type UpdatePlayerProfileInput = z.infer<typeof updatePlayerProfileInputSchema>;

export const allocateStatPointsInputSchema = z.object({
  stat: playerStatNameSchema,
  points: z.number().int().min(1).max(100),
});
export type AllocateStatPointsInput = z.infer<typeof allocateStatPointsInputSchema>;

export const questTypeSchema = z.enum([
  "daily",
  "weekly",
  "main",
  "side",
  "boss",
  "hidden",
  "penalty",
]);
export type QuestType = z.infer<typeof questTypeSchema>;

export const questStatusSchema = z.enum(["active", "completed", "failed", "expired"]);
export type QuestStatus = z.infer<typeof questStatusSchema>;

export const questLinkedActionSchema = z.enum(["workout", "water", "nutrition"]);
export type QuestLinkedAction = z.infer<typeof questLinkedActionSchema>;

export const questResponseSchema = z.object({
  id: z.string().uuid(),
  type: questTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  linkedAction: questLinkedActionSchema.nullable(),
  targetCount: z.number().int().min(1),
  progressCount: z.number().int().min(0),
  xpReward: z.number().int().min(0),
  coinReward: z.number().int().min(0),
  status: questStatusSchema,
  expiresAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  /** Postavljeno samo za Rank Examination questove (type: "boss") - rank koji zavrsavanje ovog questa dodeljuje. */
  targetRank: playerRankSchema.nullable(),
});
export type QuestResponse = z.infer<typeof questResponseSchema>;

export const exerciseDifficultySchema = z.enum(["E", "D", "C", "B", "A", "S"]);
export type ExerciseDifficulty = z.infer<typeof exerciseDifficultySchema>;

export const exerciseResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  muscleGroups: z.array(z.string()),
  equipment: z.string().nullable(),
  difficulty: exerciseDifficultySchema.nullable(),
  instructions: z.string().nullable(),
  alternativeExerciseIds: z.array(z.string().uuid()),
});
export type ExerciseResponse = z.infer<typeof exerciseResponseSchema>;

export const exerciseProgressSessionSchema = z.object({
  workoutId: z.string().uuid(),
  performedAt: z.string(),
  sets: z.array(
    z.object({ setNumber: z.number().int(), reps: z.number().int(), weightKg: z.number() }),
  ),
  topEstimated1Rm: z.number(),
});
export type ExerciseProgressSession = z.infer<typeof exerciseProgressSessionSchema>;

export const progressTrendSchema = z.enum(["up", "down", "flat", "insufficient_data"]);
export type ProgressTrend = z.infer<typeof progressTrendSchema>;

export const stagnationStatusSchema = z.enum([
  "insufficient_data",
  "progressing",
  "stagnating",
  "regressing",
]);
export type StagnationStatus = z.infer<typeof stagnationStatusSchema>;

export const exerciseProgressResponseSchema = z.object({
  exerciseId: z.string().uuid(),
  sessions: z.array(exerciseProgressSessionSchema),
  trend: progressTrendSchema,
  /**
   * "System AI" signal - gleda poslednje 3 sesije (ne samo 2 kao `trend`)
   * radi stabilnijeg signala da li je vreme za promenu programa. Videti
   * `@risesolo/domain` training.detectStagnation.
   */
  stagnationStatus: stagnationStatusSchema,
});
export type ExerciseProgressResponse = z.infer<typeof exerciseProgressResponseSchema>;

export const workoutSetInputSchema = z.object({
  exerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(200),
  weightKg: z.number().min(0).max(1000),
});
export type WorkoutSetInput = z.infer<typeof workoutSetInputSchema>;

export const logWorkoutInputSchema = z.object({
  notes: z.string().max(2000).optional(),
  sets: z.array(workoutSetInputSchema).min(1).max(100),
});
export type LogWorkoutInput = z.infer<typeof logWorkoutInputSchema>;

export const newPersonalRecordSchema = z.object({
  exerciseId: z.string().uuid(),
  weightKg: z.number(),
  reps: z.number().int(),
});

export const logWorkoutResponseSchema = z.object({
  workoutId: z.string().uuid(),
  personalRecordsCount: z.number().int().min(0),
  newPersonalRecords: z.array(newPersonalRecordSchema),
  player: playerResponseSchema,
});
export type LogWorkoutResponse = z.infer<typeof logWorkoutResponseSchema>;

export const workoutSetResponseSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  setNumber: z.number().int(),
  reps: z.number().int(),
  weightKg: z.number(),
});

export const workoutResponseSchema = z.object({
  id: z.string().uuid(),
  performedAt: z.string(),
  notes: z.string().nullable(),
  sets: z.array(workoutSetResponseSchema).optional(),
});
export type WorkoutResponse = z.infer<typeof workoutResponseSchema>;
