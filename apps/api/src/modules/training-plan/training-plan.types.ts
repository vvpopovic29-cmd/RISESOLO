import type { DayFocus, SplitType } from "@risesolo/validation";

/** Videti supabase/migrations/..._training_plans.sql. */
export interface TrainingPlanRow {
  player_id: string;
  split_type: SplitType;
  days_per_week: number;
  schedule: DayFocus[];
  updated_at: string;
}
