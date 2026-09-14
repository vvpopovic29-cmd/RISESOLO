import { createInitialStreak } from "../streaks/streak";
import { startFreeformWorkoutSession, logSet } from "../workouts/workout";
import type { WorkoutSession } from "../workouts/workout.types";
import { generateDailyQuest } from "../quests/quest";
import type { Exercise } from "../exercises/exercise.types";
import { completeWorkout } from "./completion";

const USER = "user-123";
const START = new Date("2026-09-14T10:00:00.000Z");
const END = new Date("2026-09-14T10:30:00.000Z");

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: "cal-chest-push-up",
    name: "Push-Up",
    slug: "push-up",
    library: "CALISTHENICS",
    category: "CHEST",
    subcategory: null,
    movementPattern: "PUSH",
    difficulty: "BEGINNER",
    equipment: ["BODYWEIGHT"],
    primaryMuscles: ["Chest"],
    secondaryMuscles: [],
    instructions: [],
    formCues: [],
    commonMistakes: [],
    safetyNotes: [],
    defaultSets: 3,
    defaultReps: "10-15",
    tempo: "2-0-2",
    restSeconds: 45,
    xpValue: 10,
    media: { thumbnailUrl: null, videoUrl: null, gifUrl: null },
    tags: [],
    ...overrides,
  };
}

const PUSH_UP = makeExercise({ id: "cal-chest-push-up", xpValue: 10 });
const SQUAT = makeExercise({ id: "cal-legs-squat", category: "LEGS", xpValue: 15 });
const EXERCISES = [PUSH_UP, SQUAT];

function sessionWithSets(): WorkoutSession {
  const session = startFreeformWorkoutSession({
    id: "session-1",
    userId: USER,
    exerciseIds: [PUSH_UP.id, SQUAT.id],
    now: START,
  });
  const afterPushUps = logSet(session, PUSH_UP.id, "set-1", { reps: 12, completed: true });
  if (!afterPushUps.ok) throw new Error("setup failed");
  const afterPushUps2 = logSet(afterPushUps.value, PUSH_UP.id, "set-2", {
    reps: 10,
    completed: true,
  });
  if (!afterPushUps2.ok) throw new Error("setup failed");
  const afterSquats = logSet(afterPushUps2.value, SQUAT.id, "set-1", { reps: 20, completed: true });
  if (!afterSquats.ok) throw new Error("setup failed");
  return afterSquats.value;
}

describe("completeWorkout - osnovni tok (bez questa)", () => {
  it("racuna workout XP kao zbir xpValue po zavrsenoj seriji, primenjuje na total_xp, level, rank, coins i streak", () => {
    const result = completeWorkout({
      session: sessionWithSets(),
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: null,
      now: END,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outcome = result.value;

    // 2x push-up (10) + 1x squat (15) = 35 XP
    expect(outcome.workoutXpGained).toBe(35);
    expect(outcome.questXpGained).toBe(0);
    expect(outcome.totalXpGained).toBe(35);
    expect(outcome.totalXp).toBe(35);
    expect(outcome.previousLevel).toBe(1);
    expect(outcome.newLevel).toBe(1);
    expect(outcome.levelUp).toBe(false);
    expect(outcome.previousRank).toBe("E");
    expect(outcome.newRank).toBe("E");
    expect(outcome.rankUp).toBe(false);

    // COINS_PER_XP = 5 -> floor(35/5) = 7
    expect(outcome.coinsGained).toBe(7);
    expect(outcome.totalCoins).toBe(7);

    expect(outcome.streak).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: "2026-09-14",
    });

    expect(outcome.quest).toBeNull();
    expect(outcome.session.status).toBe("COMPLETED");
    expect(outcome.summary.totalReps).toBe(42);
  });

  it("nepoznata vezba (nije u katalogu) doprinosi 0 XP umesto da baci gresku", () => {
    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: ["ne-postoji-u-katalogu"],
      now: START,
    });
    const logged = logSet(session, "ne-postoji-u-katalogu", "set-1", { reps: 10, completed: true });
    if (!logged.ok) throw new Error("setup failed");

    const result = completeWorkout({
      session: logged.value,
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: null,
      now: END,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.workoutXpGained).toBe(0);
  });

  it("prijavljuje level-up i rank-up kada XP pređe granicu", () => {
    // Level 1->2 prag je 100 XP (calculateRequiredXp(1) = 100). previousTotalXp
    // postavljen tik ispod praga tako da 35 XP iz treninga pređe granicu.
    const result = completeWorkout({
      session: sessionWithSets(),
      exercises: EXERCISES,
      previousTotalXp: 90,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: null,
      now: END,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.previousLevel).toBe(1);
    expect(result.value.newLevel).toBe(2);
    expect(result.value.levelUp).toBe(true);
  });

  it("propagira gresku iz Faze 5 kada session nema nijednu zavrsenu seriju (prazan trening)", () => {
    const empty = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: [PUSH_UP.id],
      now: START,
    });
    const result = completeWorkout({
      session: empty,
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: null,
      now: END,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ reason: "NO_PROGRESS" });
  });
});

describe("completeWorkout - integracija sa Quest sistemom", () => {
  /**
   * Fiksira unit/targetValue/reward eksplicitno (umesto da se oslanja na to
   * koji je quest deterministicki izabran za dati userId+date u Fazi 3
   * katalogu) - isti pristup kao questWithTarget() helper u quest.test.ts.
   */
  function repsQuest(targetValue: number) {
    return { ...generateDailyQuest(USER, "2026-09-14"), unit: "reps", targetValue };
  }

  it("azurira quest progres i, ako je cilj dostignut, dodaje quest XP na vrh workout XP-a", () => {
    const quest = repsQuest(20);

    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: [PUSH_UP.id],
      now: START,
    });
    const logged = logSet(session, PUSH_UP.id, "set-1", {
      reps: quest.targetValue,
      completed: true,
    });
    if (!logged.ok) throw new Error("setup failed");

    const result = completeWorkout({
      session: logged.value,
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: quest,
      now: END,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outcome = result.value;

    expect(outcome.quest).not.toBeNull();
    expect(outcome.quest?.newlyCompleted).toBe(true);
    expect(outcome.quest?.reward).toEqual(quest.reward);
    expect(outcome.questXpGained).toBe(quest.reward.xp);
    expect(outcome.totalXpGained).toBe(outcome.workoutXpGained + quest.reward.xp);
    expect(outcome.totalXp).toBe(outcome.totalXpGained);
  });

  it("delimicno azurira progres bez zavrsavanja questa ako cilj nije dostignut", () => {
    const quest = repsQuest(50);
    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: [PUSH_UP.id],
      now: START,
    });
    const logged = logSet(session, PUSH_UP.id, "set-1", { reps: 25, completed: true });
    if (!logged.ok) throw new Error("setup failed");

    const result = completeWorkout({
      session: logged.value,
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: quest,
      now: END,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quest?.newlyCompleted).toBe(false);
    expect(result.value.quest?.reward).toBeNull();
    expect(result.value.quest?.quest.progressValue).toBe(25);
    expect(result.value.questXpGained).toBe(0);
  });

  it("quest koji je vec COMPLETED se ignorise (ne blokira trening, ne daje duplu nagradu)", () => {
    const quest = repsQuest(50);
    const alreadyCompleted = {
      ...quest,
      status: "COMPLETED" as const,
      progressValue: quest.targetValue,
      completedAt: START.toISOString(),
    };

    const result = completeWorkout({
      session: sessionWithSets(),
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak: createInitialStreak(),
      previousCoins: 0,
      activeQuest: alreadyCompleted,
      now: END,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.quest).toBeNull();
    expect(result.value.questXpGained).toBe(0);
    // trening je i dalje uspesno zavrsen uprkos "mrtvom" questu
    expect(result.value.session.status).toBe("COMPLETED");
  });
});

describe("completeWorkout - streak integracija", () => {
  it("nastavlja streak ako je previousStreak aktivan od juce", () => {
    const previousStreak = {
      currentStreak: 4,
      longestStreak: 4,
      lastActivityDate: "2026-09-13",
    };
    const result = completeWorkout({
      session: sessionWithSets(),
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak,
      previousCoins: 0,
      activeQuest: null,
      now: END, // 2026-09-14
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.streak.currentStreak).toBe(5);
  });

  it("resetuje streak na 1 ako je preskocen dan", () => {
    const previousStreak = {
      currentStreak: 4,
      longestStreak: 4,
      lastActivityDate: "2026-09-10",
    };
    const result = completeWorkout({
      session: sessionWithSets(),
      exercises: EXERCISES,
      previousTotalXp: 0,
      previousStreak,
      previousCoins: 0,
      activeQuest: null,
      now: END, // 2026-09-14, gap od vise dana
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.streak.currentStreak).toBe(1);
      expect(result.value.streak.longestStreak).toBe(4);
    }
  });
});
