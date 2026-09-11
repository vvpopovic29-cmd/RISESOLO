import { z } from "zod";

/**
 * Faza 3 DTO ugovori - Nutrition (Calories/Protein/Carbs/Fat, Water,
 * Nutrition XP). Isti izvor istine za apps/api i buduci mobile klijent.
 */

export const nutritionTargetsSchema = z.object({
  calorieTarget: z.number().int().positive().nullable(),
  proteinTargetG: z.number().int().nonnegative().nullable(),
  carbTargetG: z.number().int().nonnegative().nullable(),
  fatTargetG: z.number().int().nonnegative().nullable(),
  waterTargetMl: z.number().int().positive().nullable(),
});
export type NutritionTargets = z.infer<typeof nutritionTargetsSchema>;

export const updateNutritionTargetsInputSchema = z
  .object({
    calorieTarget: z.number().int().positive().nullable().optional(),
    proteinTargetG: z.number().int().nonnegative().nullable().optional(),
    carbTargetG: z.number().int().nonnegative().nullable().optional(),
    fatTargetG: z.number().int().nonnegative().nullable().optional(),
    waterTargetMl: z.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "bar jedno polje mora biti prosledjeno",
  });
export type UpdateNutritionTargetsInput = z.infer<typeof updateNutritionTargetsInputSchema>;

export const logMealInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  calories: z.number().int().nonnegative().max(20000),
  proteinG: z.number().nonnegative().max(2000).default(0),
  carbsG: z.number().nonnegative().max(2000).default(0),
  fatG: z.number().nonnegative().max(2000).default(0),
});
export type LogMealInput = z.infer<typeof logMealInputSchema>;

export const mealLogResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  calories: z.number().int(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  loggedAt: z.string(),
});
export type MealLogResponse = z.infer<typeof mealLogResponseSchema>;

export const logWaterInputSchema = z.object({
  amountMl: z.number().int().positive().max(5000),
});
export type LogWaterInput = z.infer<typeof logWaterInputSchema>;

export const waterLogResponseSchema = z.object({
  id: z.string().uuid(),
  amountMl: z.number().int(),
  loggedAt: z.string(),
});
export type WaterLogResponse = z.infer<typeof waterLogResponseSchema>;

export const nutritionDailySummarySchema = z.object({
  date: z.string(),
  totalCalories: z.number().int(),
  totalProteinG: z.number(),
  totalCarbsG: z.number(),
  totalFatG: z.number(),
  totalWaterMl: z.number().int(),
  targets: nutritionTargetsSchema,
  meals: z.array(mealLogResponseSchema),
  waterLogs: z.array(waterLogResponseSchema),
  /** Da li su SVI postavljeni ciljevi ispunjeni za ovaj dan (false ako igrac nema nijedan postavljen cilj). */
  dailyGoalMet: z.boolean(),
  /** Da li je bonus XP (100) vec dodeljen za ovaj dan - proverava se pri svakom logMeal/logWater pozivu, ne pri ovom GET-u. */
  bonusXpGranted: z.boolean(),
});
export type NutritionDailySummary = z.infer<typeof nutritionDailySummarySchema>;
