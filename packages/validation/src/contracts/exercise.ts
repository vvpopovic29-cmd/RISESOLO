import { z } from "zod";

/**
 * Runtime ugovor za RISESOLO exercise library (data/exercises/*.json,
 * Faza 4 - EXERCISE DATABASE). packages/domain/src/exercises/exercise.types.ts
 * opisuje isti oblik na TS nivou (camelCase, posle mapiranja) - ovo je
 * runtime validacija SIROVOG (snake_case) JSON-a pre nego sto udje u app,
 * i pre nego sto se seeduje u Supabase `exercises` tabelu (Faza 2).
 */

export const exerciseLibrarySchema = z.enum(["CALISTHENICS", "GYM"]);

export const exerciseDifficultySchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const exerciseCategorySchema = z.enum([
  "CHEST",
  "BACK",
  "SHOULDERS",
  "ARMS",
  "LEGS",
  "CORE",
  "FULL_BODY",
]);

export const exerciseSubcategorySchema = z
  .enum(["BICEPS", "TRICEPS", "QUADRICEPS", "HAMSTRINGS", "GLUTES", "CALVES"])
  .nullable();

export const movementPatternSchema = z.enum([
  "PUSH",
  "PULL",
  "SQUAT",
  "HINGE",
  "CORE",
  "SKILL_ISOMETRIC",
  "FULL_BODY_CONDITIONING",
  "ISOLATION",
  "MOBILITY",
]);

export const equipmentSchema = z.enum([
  "BODYWEIGHT",
  "WALL",
  "BENCH",
  "PULL_UP_BAR",
  "DIP_BAR",
  "DUMBBELL",
  "BARBELL",
  "KETTLEBELL",
  "CABLE",
  "MACHINE",
  "RESISTANCE_BAND",
  "JUMP_ROPE",
]);

export const exerciseMediaSchema = z.object({
  thumbnail_url: z.string().url().nullable(),
  video_url: z.string().url().nullable(),
  gif_url: z.string().url().nullable(),
});

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  library: exerciseLibrarySchema,
  category: exerciseCategorySchema,
  subcategory: exerciseSubcategorySchema,
  movement_pattern: movementPatternSchema,
  difficulty: exerciseDifficultySchema,
  equipment: z.array(equipmentSchema).min(1),
  primary_muscles: z.array(z.string().min(1)).min(1),
  secondary_muscles: z.array(z.string().min(1)),
  instructions: z.array(z.string().min(1)).min(1),
  form_cues: z.array(z.string().min(1)),
  common_mistakes: z.array(z.string().min(1)),
  safety_notes: z.array(z.string().min(1)).min(1),
  default_sets: z.number().int().positive(),
  default_reps: z.string().min(1),
  tempo: z.string().min(1),
  rest_seconds: z.number().int().nonnegative(),
  xp_value: z.number().int().nonnegative(),
  media: exerciseMediaSchema,
  tags: z.array(z.string().min(1)),
});

export type ExerciseDto = z.infer<typeof exerciseSchema>;

export const exerciseLibraryFileSchema = z.object({
  version: z.number().int().positive(),
  count: z.number().int().nonnegative(),
  exercises: z.array(exerciseSchema),
});

export const skillStepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  name: z.string().min(1),
  difficulty: exerciseDifficultySchema,
  equipment: z.array(equipmentSchema).min(1),
  hold_target_seconds: z.number().int().positive().nullable(),
  is_skill_mastery: z.boolean(),
});

export const skillLineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  primary_muscles: z.array(z.string().min(1)).min(1),
  description: z.string().min(1),
  steps: z.array(skillStepSchema).min(1),
});

export type SkillLineDto = z.infer<typeof skillLineSchema>;

export const skillLibraryFileSchema = z.object({
  version: z.number().int().positive(),
  count: z.number().int().nonnegative(),
  skill_lines: z.array(skillLineSchema),
});

export const progressionChainSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: exerciseCategorySchema,
  steps: z.array(z.string().min(1).nullable()),
});

export type ProgressionChainDto = z.infer<typeof progressionChainSchema>;

export const progressionChainFileSchema = z.object({
  version: z.number().int().positive(),
  chains: z.array(progressionChainSchema),
});
