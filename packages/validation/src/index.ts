export { loadEnv, formatZodError, EnvValidationError, envPrimitives } from "./env";
export { healthResponseSchema, type HealthResponse } from "./contracts/health";
export {
  equipmentSchema,
  exerciseCategorySchema,
  exerciseDifficultySchema,
  exerciseLibraryFileSchema,
  exerciseLibrarySchema,
  exerciseMediaSchema,
  exerciseRowSchema,
  exerciseSchema,
  exerciseSubcategorySchema,
  movementPatternSchema,
  progressionChainFileSchema,
  progressionChainSchema,
  skillLibraryFileSchema,
  skillLineSchema,
  skillStepSchema,
  type ExerciseDto,
  type ExerciseRow,
  type ProgressionChainDto,
  type SkillLineDto,
} from "./contracts/exercise";
export {
  mapExerciseDtoToDomain,
  mapExerciseRowToDomain,
  mapProgressionChainDtoToDomain,
  mapSkillLineDtoToDomain,
} from "./mappers/exercise.mapper";

export {
  mapProfileRowToDomain,
  profileRowSchema,
  type Profile,
  type ProfileRow,
} from "./contracts/profile";
export { playerStatsRowSchema, type PlayerStatsRow } from "./contracts/player-stats";
export { progressionRowSchema, type ProgressionRow } from "./contracts/progression";
export {
  xpEventInsertSchema,
  xpEventRowSchema,
  type XpEventInsert,
  type XpEventRow,
} from "./contracts/xp-event";
export {
  questInsertSchema,
  questRowSchema,
  type QuestInsert,
  type QuestRow,
} from "./contracts/quest";
export {
  workoutSessionExerciseRowSchema,
  workoutSessionExerciseWithSetsRowSchema,
  workoutSessionRowSchema,
  workoutSessionStatusSchema,
  workoutSessionWithExercisesRowSchema,
  workoutSetRowSchema,
  workoutTemplateExerciseRowSchema,
  workoutTemplateRowSchema,
  workoutTemplateWithExercisesRowSchema,
  type WorkoutSessionExerciseRow,
  type WorkoutSessionExerciseWithSetsRow,
  type WorkoutSessionRow,
  type WorkoutSessionWithExercisesRow,
  type WorkoutSetRow,
  type WorkoutTemplateExerciseRow,
  type WorkoutTemplateRow,
  type WorkoutTemplateWithExercisesRow,
} from "./contracts/workout";

export { mapPlayerStatsRowToDomain } from "./mappers/player-stats.mapper";
export { mapProgressionRowToStreak } from "./mappers/streak.mapper";
export { mapDomainQuestToRow, mapQuestRowToDomain } from "./mappers/quest.mapper";
export {
  mapWorkoutSessionRowToDomain,
  mapWorkoutTemplateRowToDomain,
} from "./mappers/workout.mapper";

export { z } from "zod";
