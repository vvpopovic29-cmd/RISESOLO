import { z } from "zod";

export const exerciseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  subcategory: z.string().nullable(),
  type: z.enum(["CALISTHENICS", "GYM", "SKILL"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  equipment: z.string(),
  movementPattern: z.string(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  formCues: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  defaultSets: z.number().int().nullable(),
  defaultReps: z.string().nullable(),
  holdSeconds: z.number().int().nullable(),
  restSeconds: z.number().int().nullable(),
  progressionChain: z.string().nullable(),
  progressionOrder: z.number().int().nullable(),
});
export type ExerciseDto = z.infer<typeof exerciseSchema>;

export const listExercisesQuerySchema = z.object({
  category: z.string().optional(),
  type: z.enum(["CALISTHENICS", "GYM", "SKILL"]).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});
export type ListExercisesQuery = z.infer<typeof listExercisesQuerySchema>;
