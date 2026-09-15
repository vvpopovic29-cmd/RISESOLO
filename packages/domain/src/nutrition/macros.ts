/**
 * Osnovno pracenje ishrane - nova domena (vidi README "Poznata ogranicenja":
 * bounded-context moduli se dodaju kad se implementira odgovarajuca funkcija).
 * Namerno bez XP/coin nagrade - ovo je cisto tracking alat, ne deo core
 * gameplay loop-a (za razliku od quest/workout modula).
 */
export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface NutritionMacros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const ZERO_MACROS: NutritionMacros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/** Sabira makronutrijente svih unosa jednog dana - koristi se za dnevni rezime (apps/api/src/nutrition). */
export function sumDailyMacros(entries: readonly NutritionMacros[]): NutritionMacros {
  return entries.reduce(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      proteinG: total.proteinG + entry.proteinG,
      carbsG: total.carbsG + entry.carbsG,
      fatG: total.fatG + entry.fatG,
    }),
    ZERO_MACROS,
  );
}
