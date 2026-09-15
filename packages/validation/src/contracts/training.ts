import { z } from "zod";
import { exerciseSchema } from "./exercises";

/**
 * Jedna vezba unutar jednog dana plana - onako kako je AI model vraca i
 * onako kako se cuva u `TrainingPlan.content` (JSON). Referencira vezbu
 * preko `exerciseSlug`, ne preko DB id-a, jer AI ne zna interne cuid-ove -
 * servis proverava da slug postoji u bazi pre upisa (vidi apps/api/src/training).
 */
export const trainingPlanExerciseSchema = z.object({
  exerciseSlug: z.string().min(1),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(40),
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(300).optional(),
});
export type TrainingPlanExercise = z.infer<typeof trainingPlanExerciseSchema>;

export const trainingPlanDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  focus: z.string().min(1).max(100),
  exercises: z.array(trainingPlanExerciseSchema).min(1).max(12),
});
export type TrainingPlanDay = z.infer<typeof trainingPlanDaySchema>;

export const trainingPlanContentSchema = z.object({
  days: z.array(trainingPlanDaySchema).min(1).max(7),
});
export type TrainingPlanContent = z.infer<typeof trainingPlanContentSchema>;

/**
 * Sema koju AiService trazi od Claude-a preko tool-use-a (jedan plan na
 * zahtev, bez auto-adaptacije). `title`/`summary` su deo AI izlaza jer se
 * generisu iz konteksta profila/cilja; `days` je isti oblik koji se
 * perzistira u `TrainingPlan.content`.
 */
export const aiTrainingPlanSchema = z.object({
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400).optional(),
  days: z.array(trainingPlanDaySchema).min(1).max(7),
});
export type AiTrainingPlanOutput = z.infer<typeof aiTrainingPlanSchema>;

export const generateTrainingPlanRequestSchema = z.object({
  daysPerWeek: z.number().int().min(1).max(7),
  goal: z.string().min(1).max(200).optional(),
});
export type GenerateTrainingPlanRequest = z.infer<typeof generateTrainingPlanRequestSchema>;

export const trainingPlanSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  daysPerWeek: z.number().int(),
  model: z.string(),
  createdAt: z.string(),
});
export type TrainingPlanSummaryDto = z.infer<typeof trainingPlanSummarySchema>;

/** Vezba obogacena podacima iz Exercise tabele, za prikaz na klijentu. */
export const trainingPlanExerciseDetailSchema = trainingPlanExerciseSchema.extend({
  exercise: exerciseSchema.nullable(),
});
export type TrainingPlanExerciseDetail = z.infer<typeof trainingPlanExerciseDetailSchema>;

export const trainingPlanDayDetailSchema = trainingPlanDaySchema.extend({
  exercises: z.array(trainingPlanExerciseDetailSchema).min(1),
});
export type TrainingPlanDayDetail = z.infer<typeof trainingPlanDayDetailSchema>;

export const trainingPlanDetailSchema = trainingPlanSummarySchema.extend({
  content: z.object({
    days: z.array(trainingPlanDayDetailSchema).min(1),
  }),
});
export type TrainingPlanDetailDto = z.infer<typeof trainingPlanDetailSchema>;
