import type { ExerciseDifficulty } from "@risesolo/validation";
import type { PlayerRow } from "../player/player.types";

/** Videti supabase/migrations/..._gamification_core_schema.sql. */
export interface ExerciseRow {
  id: string;
  name: string;
  muscle_groups: string[];
  equipment: string | null;
  difficulty: ExerciseDifficulty | null;
  instructions: string | null;
}

export interface ExerciseAlternativeRow {
  exercise_id: string;
  alternative_exercise_id: string;
}

export interface WorkoutRow {
  id: string;
  player_id: string;
  performed_at: string;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSetRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
}

/** JSON koji vraca fn_log_workout (jsonb_build_object u SQL-u, snake_case kljucevi). */
export interface LogWorkoutRpcResult {
  workout_id: string;
  personal_records_count: number;
  new_personal_records: Array<{ exercise_id: string; weight_kg: number; reps: number }>;
  player: PlayerRow;
}
