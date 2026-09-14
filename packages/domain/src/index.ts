export type { Brand } from "./kernel/brand";
export { type Result, ok, err } from "./kernel/result";
export { assertNever } from "./kernel/assert-never";

export type {
  Exercise,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseLibrary,
  ExerciseMedia,
  ExerciseSubcategory,
  Equipment,
  MovementPattern,
  ProgressionChain,
  SkillLine,
  SkillStep,
} from "./exercises/exercise.types";

export {
  filterExercisesByAvailableEquipment,
  filterExercisesByCategory,
  filterExercisesByDifficulty,
  findExerciseById,
  findExerciseBySlug,
  findProgressionChain,
  findSkillLine,
  firstSkillStep,
  groupExercisesByCategory,
  masterySkillStep,
  nextSkillStep,
  resolveProgressionChainExercises,
} from "./exercises/query";

export {
  BASE_LEVEL,
  calculateCurrentLevelXp,
  calculateLevel,
  calculateProgress,
  calculateRank,
  calculateRequiredXp,
  calculateStatPointsAwarded,
  calculateTotalXpForLevel,
  applyXpGain,
  allocateStatPoints,
  createInitialStats,
  grantStatPoints,
  minLevelForRank,
  nextRank,
  STARTING_STAT_VALUE,
  STAT_KEYS,
  STAT_POINTS_PER_LEVEL,
  totalAllocatedStats,
  type AllocateStatPointsError,
  type PlayerStats,
  type Rank,
  type StatKey,
  type XpGainResult,
  type XpProgress,
} from "./progression";

export {
  completeQuest,
  expireQuest,
  findQuestDefinition,
  generateDailyQuest,
  hasExpired,
  pickQuestDefinition,
  QUEST_DEFINITIONS,
  QUEST_TERMINAL_STATUSES,
  resolveDailyQuest,
  updateQuestProgress,
  type DailyQuest,
  type QuestDefinition,
  type QuestReward,
  type QuestStatus,
  type QuestTransitionError,
} from "./quests";

export {
  abandonWorkoutSession,
  completeWorkoutSession,
  computeWorkoutSessionSummary,
  createWorkoutTemplate,
  getSessionExercise,
  logSet,
  startFreeformWorkoutSession,
  startWorkoutSessionFromTemplate,
  type CreateWorkoutTemplateInput,
  type StartFreeformWorkoutSessionInput,
  type StartWorkoutSessionFromTemplateInput,
  type WorkoutSession,
  type WorkoutSessionError,
  type WorkoutSessionExercise,
  type WorkoutSessionStatus,
  type WorkoutSessionSummary,
  type WorkoutSet,
  type WorkoutSetInput,
  type WorkoutTemplate,
  type WorkoutTemplateExercise,
} from "./workouts";

export { calculateCoinsForXp, COINS_PER_XP } from "./rewards";

export {
  computeDisplayedStreak,
  createInitialStreak,
  updateStreakForActivity,
  type StreakState,
} from "./streaks";

export {
  completeWorkout,
  type CompleteWorkoutInput,
  type CompletionOutcome,
  type QuestUpdateOutcome,
} from "./completion";
