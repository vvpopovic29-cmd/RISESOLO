import type { Exercise } from "../exercises/exercise.types";
import type { Rank } from "../progression/rank";
import type { DailyQuest, QuestReward } from "../quests/quest.types";
import type { StreakState } from "../streaks/streak.types";
import type { WorkoutSession, WorkoutSessionSummary } from "../workouts/workout.types";

export interface CompleteWorkoutInput {
  /** Session u statusu IN_PROGRESS koji se upravo zavrsava. */
  readonly session: WorkoutSession;
  /** Katalog vezbi (Faza 4) - koristi se za XP vrednost po vezbi. */
  readonly exercises: readonly Exercise[];
  readonly previousTotalXp: number;
  readonly previousStreak: StreakState;
  readonly previousCoins: number;
  /** Aktivan Daily Quest korisnika za danas, ili null ako ga nema. */
  readonly activeQuest: DailyQuest | null;
  readonly now: Date;
}

export interface QuestUpdateOutcome {
  readonly quest: DailyQuest;
  readonly progressDelta: number;
  readonly newlyCompleted: boolean;
  readonly reward: QuestReward | null;
}

export interface CompletionOutcome {
  readonly session: WorkoutSession;
  readonly summary: WorkoutSessionSummary;
  readonly workoutXpGained: number;
  readonly questXpGained: number;
  readonly totalXpGained: number;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly levelUp: boolean;
  readonly previousRank: Rank;
  readonly newRank: Rank;
  readonly rankUp: boolean;
  readonly totalXp: number;
  readonly coinsGained: number;
  readonly totalCoins: number;
  /** null ako nije prosledjen activeQuest, ili ako je vec bio zavrsen/istekao (quest neuspeh ne blokira trening). */
  readonly quest: QuestUpdateOutcome | null;
  readonly streak: StreakState;
}
