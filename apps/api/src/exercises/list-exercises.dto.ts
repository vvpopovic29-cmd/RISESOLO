import { exerciseCategorySchema, exerciseDifficultySchema, z } from "@risesolo/validation";

export const listExercisesQuerySchema = z.object({
  category: exerciseCategorySchema.optional(),
  difficulty: exerciseDifficultySchema.optional(),
});

export type ListExercisesQueryDto = z.infer<typeof listExercisesQuerySchema>;
