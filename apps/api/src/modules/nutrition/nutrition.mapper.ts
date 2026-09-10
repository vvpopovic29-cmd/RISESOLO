import type { MealLogResponse, NutritionTargets, WaterLogResponse } from "@risesolo/validation";
import type { MealLogRow, NutritionTargetsRow, WaterLogRow } from "./nutrition.types";

/** `row` je null kada igrac jos nije postavio nijedan cilj - sva polja su tada null. */
export function mapNutritionTargetsRowToResponse(
  row: NutritionTargetsRow | null,
): NutritionTargets {
  return {
    calorieTarget: row?.calorie_target ?? null,
    proteinTargetG: row?.protein_target_g ?? null,
    carbTargetG: row?.carb_target_g ?? null,
    fatTargetG: row?.fat_target_g ?? null,
    waterTargetMl: row?.water_target_ml ?? null,
  };
}

export function mapMealLogRowToResponse(row: MealLogRow): MealLogResponse {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    loggedAt: row.logged_at,
  };
}

export function mapWaterLogRowToResponse(row: WaterLogRow): WaterLogResponse {
  return {
    id: row.id,
    amountMl: row.amount_ml,
    loggedAt: row.logged_at,
  };
}
