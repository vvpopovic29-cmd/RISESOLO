/** Videti supabase/migrations/..._nutrition_system.sql. */
export interface NutritionTargetsRow {
  player_id: string;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
  water_target_ml: number | null;
  updated_at: string;
}

export interface MealLogRow {
  id: string;
  player_id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
  created_at: string;
}

export interface WaterLogRow {
  id: string;
  player_id: string;
  amount_ml: number;
  logged_at: string;
}
