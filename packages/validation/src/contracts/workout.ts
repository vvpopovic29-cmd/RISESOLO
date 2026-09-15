import { z } from "zod";

/**
 * Runtime ugovori za `public.workout_templates(_exercises)` i
 * `public.workout_sessions(_exercises)`/`workout_sets` (Faza 5). "With..."
 * varijante prate oblik koji Supabase vraca za ugnjezden select (npr.
 * `.select("*, workout_session_exercises(*, workout_sets(*))")`).
 */

export const workoutSessionStatusSchema = z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]);

export const workoutSetRowSchema = z.object({
  id: z.string().uuid(),
  session_exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  reps: z.number().int().nonnegative().nullable(),
  weight: z.number().nonnegative().nullable(),
  duration_seconds: z.number().int().nonnegative().nullable(),
  assistance: z.string().nullable(),
  completed: z.boolean(),
  created_at: z.string(),
});
export type WorkoutSetRow = z.infer<typeof workoutSetRowSchema>;

export const workoutSessionExerciseRowSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  exercise_id: z.string().min(1),
  order_index: z.number().int().positive(),
});
export type WorkoutSessionExerciseRow = z.infer<typeof workoutSessionExerciseRowSchema>;

export const workoutSessionExerciseWithSetsRowSchema = workoutSessionExerciseRowSchema.extend({
  workout_sets: z.array(workoutSetRowSchema),
});
export type WorkoutSessionExerciseWithSetsRow = z.infer<
  typeof workoutSessionExerciseWithSetsRowSchema
>;

export const workoutSessionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  workout_template_id: z.string().uuid().nullable(),
  status: workoutSessionStatusSchema,
  started_at: z.string(),
  completed_at: z.string().nullable(),
});
export type WorkoutSessionRow = z.infer<typeof workoutSessionRowSchema>;

export const workoutSessionWithExercisesRowSchema = workoutSessionRowSchema.extend({
  workout_session_exercises: z.array(workoutSessionExerciseWithSetsRowSchema),
});
export type WorkoutSessionWithExercisesRow = z.infer<typeof workoutSessionWithExercisesRowSchema>;

export const workoutTemplateExerciseRowSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  exercise_id: z.string().min(1),
  order_index: z.number().int().positive(),
  target_sets: z.number().int().positive(),
  target_reps: z.string().nullable(),
  target_duration_seconds: z.number().int().positive().nullable(),
  rest_seconds: z.number().int().nonnegative(),
});
export type WorkoutTemplateExerciseRow = z.infer<typeof workoutTemplateExerciseRowSchema>;

export const workoutTemplateRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  name: z.string().min(1),
  description: z.string(),
  created_at: z.string(),
});
export type WorkoutTemplateRow = z.infer<typeof workoutTemplateRowSchema>;

export const workoutTemplateWithExercisesRowSchema = workoutTemplateRowSchema.extend({
  workout_template_exercises: z.array(workoutTemplateExerciseRowSchema),
});
export type WorkoutTemplateWithExercisesRow = z.infer<typeof workoutTemplateWithExercisesRowSchema>;
