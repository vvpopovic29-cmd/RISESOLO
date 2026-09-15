import type {
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSet,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from "@risesolo/domain";
import type {
  WorkoutSessionExerciseWithSetsRow,
  WorkoutSessionWithExercisesRow,
  WorkoutSetRow,
  WorkoutTemplateExerciseRow,
  WorkoutTemplateWithExercisesRow,
} from "../contracts/workout";

function mapSetRow(row: WorkoutSetRow): WorkoutSet {
  return {
    id: row.id,
    setNumber: row.set_number,
    reps: row.reps,
    weight: row.weight,
    durationSeconds: row.duration_seconds,
    assistance: row.assistance,
    completed: row.completed,
  };
}

function mapSessionExerciseRow(row: WorkoutSessionExerciseWithSetsRow): WorkoutSessionExercise {
  return {
    exerciseId: row.exercise_id,
    order: row.order_index,
    sets: [...row.workout_sets].sort((a, b) => a.set_number - b.set_number).map(mapSetRow),
  };
}

export function mapWorkoutSessionRowToDomain(row: WorkoutSessionWithExercisesRow): WorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    workoutTemplateId: row.workout_template_id,
    status: row.status,
    exercises: [...row.workout_session_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map(mapSessionExerciseRow),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapTemplateExerciseRow(row: WorkoutTemplateExerciseRow): WorkoutTemplateExercise {
  return {
    exerciseId: row.exercise_id,
    order: row.order_index,
    targetSets: row.target_sets,
    targetReps: row.target_reps,
    targetDurationSeconds: row.target_duration_seconds,
    restSeconds: row.rest_seconds,
  };
}

export function mapWorkoutTemplateRowToDomain(
  row: WorkoutTemplateWithExercisesRow,
): WorkoutTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    exercises: [...row.workout_template_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map(mapTemplateExerciseRow),
    createdAt: row.created_at,
  };
}
