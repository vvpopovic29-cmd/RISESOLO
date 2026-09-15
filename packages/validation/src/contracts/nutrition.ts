import { MEAL_TYPES } from "@risesolo/domain";
import { z } from "zod";

export const createNutritionEntryRequestSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu GGGG-MM-DD"),
  mealType: z.enum(MEAL_TYPES),
  name: z.string().min(1).max(120),
  calories: z.number().int().min(0).max(5000),
  proteinG: z.number().int().min(0).max(500),
  carbsG: z.number().int().min(0).max(1000),
  fatG: z.number().int().min(0).max(500),
});
export type CreateNutritionEntryRequest = z.infer<typeof createNutritionEntryRequestSchema>;

export const getNutritionDayQuerySchema = z.object({
  /** Bez ovoga - danasnji datum (server-side, vidi apps/api/src/nutrition). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type GetNutritionDayQuery = z.infer<typeof getNutritionDayQuerySchema>;

export const nutritionEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  mealType: z.enum(MEAL_TYPES),
  name: z.string(),
  calories: z.number().int(),
  proteinG: z.number().int(),
  carbsG: z.number().int(),
  fatG: z.number().int(),
});
export type NutritionEntryDto = z.infer<typeof nutritionEntrySchema>;

const nutritionMacrosSchema = z.object({
  calories: z.number().int(),
  proteinG: z.number().int(),
  carbsG: z.number().int(),
  fatG: z.number().int(),
});

/** GET /nutrition/entries?date=GGGG-MM-DD - svi unosi tog dana + sabrani dnevni totali (packages/domain sumDailyMacros). */
export const dailyNutritionSummarySchema = z.object({
  date: z.string(),
  entries: z.array(nutritionEntrySchema),
  totals: nutritionMacrosSchema,
});
export type DailyNutritionSummaryDto = z.infer<typeof dailyNutritionSummarySchema>;
