export { loadEnv, formatZodError, EnvValidationError, envPrimitives } from "./env";
export { healthResponseSchema, type HealthResponse } from "./contracts/health";
export {
  registerRequestSchema,
  loginRequestSchema,
  authUserSchema,
  authResponseSchema,
  type RegisterRequest,
  type LoginRequest,
  type AuthUser,
  type AuthResponse,
} from "./contracts/auth";
export {
  playerStatsSchema,
  playerProgressionSchema,
  playerProfileSchema,
  playerStateSchema,
  onboardProfileRequestSchema,
  allocateStatPointsRequestSchema,
  type PlayerStatsDto,
  type PlayerProgressionDto,
  type PlayerProfileDto,
  type PlayerStateDto,
  type OnboardProfileRequest,
  type AllocateStatPointsRequest,
} from "./contracts/players";
export {
  exerciseSchema,
  listExercisesQuerySchema,
  type ExerciseDto,
  type ListExercisesQuery,
} from "./contracts/exercises";
export { dailyQuestSchema, type DailyQuestDto } from "./contracts/quests";
export {
  trainingPlanExerciseSchema,
  trainingPlanDaySchema,
  trainingPlanContentSchema,
  aiTrainingPlanSchema,
  generateTrainingPlanRequestSchema,
  trainingPlanSummarySchema,
  trainingPlanExerciseDetailSchema,
  trainingPlanDayDetailSchema,
  trainingPlanDetailSchema,
  type TrainingPlanExercise,
  type TrainingPlanDay,
  type TrainingPlanContent,
  type AiTrainingPlanOutput,
  type GenerateTrainingPlanRequest,
  type TrainingPlanSummaryDto,
  type TrainingPlanExerciseDetail,
  type TrainingPlanDayDetail,
  type TrainingPlanDetailDto,
} from "./contracts/training";
export {
  startWorkoutSessionRequestSchema,
  workoutSessionSchema,
  logSetRequestSchema,
  completeWorkoutResponseSchema,
  type StartWorkoutSessionRequest,
  type WorkoutSessionDto,
  type LogSetRequest,
  type CompleteWorkoutResponse,
} from "./contracts/workouts";
export { z } from "zod";
