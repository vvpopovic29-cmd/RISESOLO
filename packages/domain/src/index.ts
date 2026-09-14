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
