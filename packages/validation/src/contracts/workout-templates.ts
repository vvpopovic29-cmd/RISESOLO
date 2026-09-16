import { z } from "zod";
import { exerciseSchema } from "./exercises";

/** POST /workouts/templates - jedna vezba u redosledu kreiranja (order se izvodi iz pozicije u nizu, ne salje klijent). */
export const workoutTemplateExerciseInputSchema = z.object({
  exerciseId: z.string().min(1),
  targetSets: z.number().int().min(1).max(20).optional(),
});
export type WorkoutTemplateExerciseInput = z.infer<typeof workoutTemplateExerciseInputSchema>;

export const createWorkoutTemplateRequestSchema = z.object({
  name: z.string().min(1).max(60),
  exercises: z.array(workoutTemplateExerciseInputSchema).min(1).max(20),
});
export type CreateWorkoutTemplateRequest = z.infer<typeof createWorkoutTemplateRequestSchema>;

export const workoutTemplateSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  exerciseCount: z.number().int().min(0),
  createdAt: z.string(),
});
export type WorkoutTemplateSummaryDto = z.infer<typeof workoutTemplateSummarySchema>;

/** Vezba obogacena podacima iz Exercise tabele, za prikaz na klijentu (isti princip kao TrainingPlanExerciseDetail). */
export const workoutTemplateExerciseDetailSchema = z.object({
  order: z.number().int().min(1),
  targetSets: z.number().int().nullable(),
  exercise: exerciseSchema.nullable(),
});
export type WorkoutTemplateExerciseDetail = z.infer<typeof workoutTemplateExerciseDetailSchema>;

export const workoutTemplateDetailSchema = workoutTemplateSummarySchema.extend({
  exercises: z.array(workoutTemplateExerciseDetailSchema),
});
export type WorkoutTemplateDetailDto = z.infer<typeof workoutTemplateDetailSchema>;
