import type { ExerciseResponse, LogWorkoutResponse, WorkoutResponse } from "@risesolo/validation";
import { mapPlayerRowToResponse } from "../player/player.mapper";
import type { ExerciseRow, LogWorkoutRpcResult, WorkoutRow, WorkoutSetRow } from "./workout.types";

export function mapExerciseRowToResponse(row: ExerciseRow): ExerciseResponse {
  return {
    id: row.id,
    name: row.name,
    muscleGroups: row.muscle_groups,
    equipment: row.equipment,
  };
}

export function mapWorkoutRowToResponse(row: WorkoutRow, sets?: WorkoutSetRow[]): WorkoutResponse {
  return {
    id: row.id,
    performedAt: row.performed_at,
    notes: row.notes,
    sets: sets?.map((set) => ({
      id: set.id,
      exerciseId: set.exercise_id,
      setNumber: set.set_number,
      reps: set.reps,
      weightKg: set.weight_kg,
    })),
  };
}

export function mapLogWorkoutResult(result: LogWorkoutRpcResult): LogWorkoutResponse {
  return {
    workoutId: result.workout_id,
    personalRecordsCount: result.personal_records_count,
    newPersonalRecords: result.new_personal_records.map((pr) => ({
      exerciseId: pr.exercise_id,
      weightKg: pr.weight_kg,
      reps: pr.reps,
    })),
    player: mapPlayerRowToResponse(result.player),
  };
}
