import { z } from "zod";

/**
 * Faza 7 DTO ugovor - Training Plans. `schedule` je uvek tacno 7 stavki
 * (ponedeljak..nedelja) - generise ga backend preko
 * `@risesolo/domain` training.generateWeeklySchedule, klijent ga nikad ne
 * salje direktno (samo bira splitType/daysPerWeek).
 */

export const splitTypeSchema = z.enum(["push_pull_legs", "upper_lower", "full_body"]);
export type SplitType = z.infer<typeof splitTypeSchema>;

export const dayFocusSchema = z.enum([
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full_body",
  "rest",
]);
export type DayFocus = z.infer<typeof dayFocusSchema>;

/**
 * Sva polja su nullable - igrac moze jos uvek nemati postavljen plan
 * (isti obrazac kao `nutritionTargetsSchema`, koji je takodje sve-ili-nista
 * nullable dok igrac prvi put ne postavi ciljeve).
 */
export const trainingPlanResponseSchema = z.object({
  splitType: splitTypeSchema.nullable(),
  daysPerWeek: z.number().int().min(1).max(7).nullable(),
  schedule: z.array(dayFocusSchema).length(7).nullable(),
  updatedAt: z.string().nullable(),
});
export type TrainingPlanResponse = z.infer<typeof trainingPlanResponseSchema>;

export const updateTrainingPlanInputSchema = z.object({
  splitType: splitTypeSchema,
  daysPerWeek: z.number().int().min(1).max(7),
});
export type UpdateTrainingPlanInput = z.infer<typeof updateTrainingPlanInputSchema>;
