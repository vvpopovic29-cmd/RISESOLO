/**
 * Ogledalo SQL logike u `fn_maybe_grant_nutrition_daily_bonus`
 * (supabase/migrations) - drzati u sinhronizaciji ako se pragovi promene.
 *
 * Kalorije se ocenjuju u tolerantnom opsegu (+/- 10%) jer je pogadjanje
 * tacnog broja neralno; protein/carbs/fat/voda su minimumi (>=).
 * Cilj koji nije postavljen (null) se ignorise - ako igrac nema nijedan
 * postavljen cilj, dnevni bonus se ne moze dodeliti.
 */

const CALORIE_TOLERANCE = 0.1;

export interface NutritionDailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export interface NutritionDailyGoalTargets {
  calorieTarget: number | null;
  proteinTargetG: number | null;
  carbTargetG: number | null;
  fatTargetG: number | null;
  waterTargetMl: number | null;
}

export function isNutritionDailyGoalMet(
  actual: NutritionDailyTotals,
  targets: NutritionDailyGoalTargets,
): boolean {
  const hasAnyTarget =
    targets.calorieTarget !== null ||
    targets.proteinTargetG !== null ||
    targets.carbTargetG !== null ||
    targets.fatTargetG !== null ||
    targets.waterTargetMl !== null;

  if (!hasAnyTarget) {
    return false;
  }

  const caloriesOk =
    targets.calorieTarget === null ||
    (actual.calories >= targets.calorieTarget * (1 - CALORIE_TOLERANCE) &&
      actual.calories <= targets.calorieTarget * (1 + CALORIE_TOLERANCE));
  const proteinOk = targets.proteinTargetG === null || actual.proteinG >= targets.proteinTargetG;
  const carbsOk = targets.carbTargetG === null || actual.carbsG >= targets.carbTargetG;
  const fatOk = targets.fatTargetG === null || actual.fatG >= targets.fatTargetG;
  const waterOk = targets.waterTargetMl === null || actual.waterMl >= targets.waterTargetMl;

  return caloriesOk && proteinOk && carbsOk && fatOk && waterOk;
}
