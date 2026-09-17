import { z } from "zod";

export const workoutHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type WorkoutHistoryQuery = z.infer<typeof workoutHistoryQuerySchema>;

/** Odradjene serije jedne vezbe unutar jedne zavrsene sesije, sazete za prikaz istorije. */
export const workoutHistoryExerciseSchema = z.object({
  exerciseId: z.string(),
  exerciseSlug: z.string(),
  exerciseName: z.string(),
  setCount: z.number().int().min(1),
  bestReps: z.number().int().nullable(),
  bestDurationSeconds: z.number().int().nullable(),
});
export type WorkoutHistoryExerciseDto = z.infer<typeof workoutHistoryExerciseSchema>;

/** `xpGained` je samo bazna WORKOUT_COMPLETE nagrada za ovu sesiju (iz XpEvent ledgera) -
 * ne ukljucuje eventualni bonus od dnevnog/boss questa koji je taj dan takodje zavrsen. */
export const workoutHistoryEntrySchema = z.object({
  id: z.string(),
  workoutName: z.string().nullable(),
  completedAt: z.string(),
  xpGained: z.number().int(),
  exercises: z.array(workoutHistoryExerciseSchema),
});
export type WorkoutHistoryEntryDto = z.infer<typeof workoutHistoryEntrySchema>;

/** Licni rekord po vezbi - najbolja ikad ulogovana serija (max reps / max trajanje) preko svih zavrsenih sesija. */
export const personalRecordSchema = z.object({
  exerciseId: z.string(),
  exerciseSlug: z.string(),
  exerciseName: z.string(),
  bestReps: z.number().int().nullable(),
  bestDurationSeconds: z.number().int().nullable(),
});
export type PersonalRecordDto = z.infer<typeof personalRecordSchema>;
