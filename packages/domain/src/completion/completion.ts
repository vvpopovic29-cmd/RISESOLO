/**
 * Completion Engine (Faza 6) - srce MVP-a. Spaja sve prethodne faze u
 * jedan tok, tacno po planu:
 *
 *   COMPLETE WORKOUT
 *        v
 *   Backend validation (ponovo koristi Fazu 5 - completeWorkoutSession)
 *        v
 *   Create XP Event / Calculate XP  (Faza 4 - xpValue po vezbi)
 *        v
 *   Calculate Level / Check level-up (Faza 1)
 *        v
 *   Check Rank                       (Faza 1)
 *        v
 *   Grant coins                      (Faza 8 - minimalni preview)
 *        v
 *   Update quest                     (Faza 3)
 *        v
 *   Update streak                    (Faza 9 - minimalni preview)
 *        v
 *   Return new Player State
 *
 * Server je jedini autoritet: klijent NIKAD ne salje xp_gained/coins/level
 * sam - sve se racuna ovde, iz stvarno zavrsenih serija u session-u.
 *
 * Bitno pravilo: neuspeh quest-a (vec zavrsen/istekao) NIKAD ne blokira
 * zavrsetak treninga - trening, XP, level i streak se svejedno racunaju.
 */
import { ok, type Result } from "../kernel/result";
import { findExerciseById } from "../exercises/query";
import type { Exercise } from "../exercises/exercise.types";
import { applyXpGain } from "../progression/xp";
import { calculateRank } from "../progression/rank";
import { calculateStatPointsAwarded } from "../progression/stats";
import { completeQuest, updateQuestProgress, QUEST_TERMINAL_STATUSES } from "../quests/quest";
import type { DailyQuest, QuestReward } from "../quests/quest.types";
import { calculateCoinsForXp } from "../rewards/coins";
import { updateStreakForActivity } from "../streaks/streak";
import {
  completeWorkoutSession,
  computeWorkoutSessionSummary,
  type WorkoutSessionError,
} from "../workouts/workout";
import type { WorkoutSession, WorkoutSessionSummary } from "../workouts/workout.types";
import type {
  CompleteWorkoutInput,
  CompletionOutcome,
  QuestUpdateOutcome,
} from "./completion.types";

/** XP osvojen u ovom treningu = zbir xpValue vezbe za svaku ZAVRSENU seriju. Nepoznata vezba (nije u katalogu) doprinosi 0. */
function calculateWorkoutXp(session: WorkoutSession, exercises: readonly Exercise[]): number {
  let total = 0;
  for (const sessionExercise of session.exercises) {
    const exercise = findExerciseById(exercises, sessionExercise.exerciseId);
    if (!exercise) continue;
    const completedSets = sessionExercise.sets.filter((s) => s.completed).length;
    total += exercise.xpValue * completedSets;
  }
  return total;
}

/**
 * MVP aproksimacija napretka questa iz jednog treninga, na osnovu
 * quest.unit-a. Quest NE zna za konkretne vezbe (namerna odluka iz Faze 3),
 * pa je "reps" ovde ukupan broj ponavljanja u CELOM treningu, ne samo za
 * vezbu na koju quest cilja - dovoljno tacno za MVP, precizira se kad se
 * quest-ovi povezu sa konkretnim exerciseId-jevima.
 */
function estimateQuestProgressDelta(quest: DailyQuest, summary: WorkoutSessionSummary): number {
  switch (quest.unit) {
    case "workouts":
      return 1;
    case "minutes":
      return summary.durationMinutes ?? 0;
    case "seconds":
      return summary.totalDurationSeconds;
    case "reps":
      return summary.totalReps;
    default:
      return 0;
  }
}

function applyQuestUpdate(
  quest: DailyQuest,
  summary: WorkoutSessionSummary,
  now: Date,
): QuestUpdateOutcome | null {
  if (QUEST_TERMINAL_STATUSES.includes(quest.status)) {
    return null;
  }
  const progressDelta = estimateQuestProgressDelta(quest, summary);
  if (progressDelta <= 0) {
    return null;
  }
  const progressResult = updateQuestProgress(quest, quest.progressValue + progressDelta, now);
  if (!progressResult.ok) {
    return null;
  }
  let updatedQuest = progressResult.value;
  let newlyCompleted = false;
  let reward: QuestReward | null = null;

  const completeResult = completeQuest(updatedQuest, now);
  if (completeResult.ok) {
    updatedQuest = completeResult.value.quest;
    newlyCompleted = true;
    reward = completeResult.value.reward;
  }

  return { quest: updatedQuest, progressDelta, newlyCompleted, reward };
}

export function completeWorkout(
  input: CompleteWorkoutInput,
): Result<CompletionOutcome, WorkoutSessionError> {
  const sessionResult = completeWorkoutSession(input.session, input.now);
  if (!sessionResult.ok) {
    return sessionResult;
  }
  const session = sessionResult.value;
  const summary = computeWorkoutSessionSummary(session);

  const workoutXpGained = calculateWorkoutXp(session, input.exercises);
  const afterWorkout = applyXpGain(input.previousTotalXp, workoutXpGained);

  const questOutcome = input.activeQuest
    ? applyQuestUpdate(input.activeQuest, summary, input.now)
    : null;

  const questXpGained = questOutcome?.reward?.xp ?? 0;
  const afterQuest = questXpGained > 0 ? applyXpGain(afterWorkout.newTotalXp, questXpGained) : null;

  const totalXp = afterQuest?.newTotalXp ?? afterWorkout.newTotalXp;
  const newLevel = afterQuest?.newLevel ?? afterWorkout.newLevel;
  const levelUp = afterWorkout.leveledUp || (afterQuest?.leveledUp ?? false);

  const previousLevel = afterWorkout.previousLevel;
  const previousRank = calculateRank(previousLevel);
  const newRank = calculateRank(newLevel);
  const statPointsAwarded = calculateStatPointsAwarded(previousLevel, newLevel);

  const totalXpGained = workoutXpGained + questXpGained;
  const coinsGained = calculateCoinsForXp(totalXpGained);
  const totalCoins = input.previousCoins + coinsGained;

  const activityDate = input.now.toISOString().slice(0, 10);
  const streak = updateStreakForActivity(input.previousStreak, activityDate);

  return ok({
    session,
    summary,
    workoutXpGained,
    questXpGained,
    totalXpGained,
    previousLevel,
    newLevel,
    levelUp,
    statPointsAwarded,
    previousRank,
    newRank,
    rankUp: newRank !== previousRank,
    totalXp,
    coinsGained,
    totalCoins,
    quest: questOutcome,
    streak,
  });
}
