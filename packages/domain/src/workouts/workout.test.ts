import {
  abandonWorkoutSession,
  completeWorkoutSession,
  computeWorkoutSessionSummary,
  createWorkoutTemplate,
  getSessionExercise,
  logSet,
  startFreeformWorkoutSession,
  startWorkoutSessionFromTemplate,
} from "./workout";
import type { WorkoutSession, WorkoutTemplate } from "./workout.types";

const USER = "user-123";
const START = new Date("2026-09-14T10:00:00.000Z");
const LATER = new Date("2026-09-14T10:45:00.000Z");

function baseTemplate(): WorkoutTemplate {
  return createWorkoutTemplate({
    id: "template-push-day",
    userId: USER,
    name: "Push Day",
    description: "Chest, shoulders, triceps.",
    exercises: [
      {
        exerciseId: "cal-chest-push-up",
        targetSets: 3,
        targetReps: "10-15",
        targetDurationSeconds: null,
        restSeconds: 60,
      },
      {
        exerciseId: "cal-shoulders-pike-push-up",
        targetSets: 3,
        targetReps: "8-12",
        targetDurationSeconds: null,
        restSeconds: 60,
      },
    ],
    now: START,
  });
}

describe("createWorkoutTemplate", () => {
  it("dodeljuje redosled (order) prema poziciji u nizu", () => {
    const template = baseTemplate();
    expect(template.exercises[0]?.order).toBe(1);
    expect(template.exercises[1]?.order).toBe(2);
  });

  it("baca gresku za prazan spisak vezbi", () => {
    expect(() =>
      createWorkoutTemplate({
        id: "t",
        userId: USER,
        name: "Empty",
        description: "",
        exercises: [],
        now: START,
      }),
    ).toThrow(RangeError);
  });

  it("baca gresku za nevalidan targetSets", () => {
    expect(() =>
      createWorkoutTemplate({
        id: "t",
        userId: USER,
        name: "Bad",
        description: "",
        exercises: [
          {
            exerciseId: "x",
            targetSets: 0,
            targetReps: null,
            targetDurationSeconds: null,
            restSeconds: 60,
          },
        ],
        now: START,
      }),
    ).toThrow(RangeError);
  });
});

describe("startWorkoutSessionFromTemplate / startFreeformWorkoutSession", () => {
  it("session iz templatea preslikava vezbe bez serija i pamti workoutTemplateId", () => {
    const template = baseTemplate();
    const session = startWorkoutSessionFromTemplate({
      id: "session-1",
      userId: USER,
      template,
      now: START,
    });
    expect(session.status).toBe("IN_PROGRESS");
    expect(session.workoutTemplateId).toBe(template.id);
    expect(session.exercises).toHaveLength(2);
    expect(session.exercises.every((e) => e.sets.length === 0)).toBe(true);
    expect(session.completedAt).toBeNull();
  });

  it("freeform session nema workoutTemplateId", () => {
    const session = startFreeformWorkoutSession({
      id: "session-2",
      userId: USER,
      exerciseIds: ["cal-legs-squat"],
      now: START,
    });
    expect(session.workoutTemplateId).toBeNull();
    expect(session.exercises).toEqual([{ exerciseId: "cal-legs-squat", order: 1, sets: [] }]);
  });

  it("freeform session baca gresku bez ijedne vezbe", () => {
    expect(() =>
      startFreeformWorkoutSession({ id: "s", userId: USER, exerciseIds: [], now: START }),
    ).toThrow(RangeError);
  });
});

describe("logSet", () => {
  function inProgressSession(): WorkoutSession {
    return startFreeformWorkoutSession({
      id: "session-1",
      userId: USER,
      exerciseIds: ["cal-chest-push-up", "cal-legs-squat"],
      now: START,
    });
  }

  it("dodaje seriju sa auto-inkrementovanim setNumber za tu vezbu", () => {
    const session = inProgressSession();
    const afterFirst = logSet(session, "cal-chest-push-up", "set-1", { reps: 12, completed: true });
    expect(afterFirst.ok).toBe(true);
    if (!afterFirst.ok) return;
    const afterSecond = logSet(afterFirst.value, "cal-chest-push-up", "set-2", {
      reps: 10,
      completed: true,
    });
    expect(afterSecond.ok).toBe(true);
    if (!afterSecond.ok) return;
    const exercise = getSessionExercise(afterSecond.value, "cal-chest-push-up");
    expect(exercise?.sets.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  it("gym-stil serija cuva weight+reps, calisthenics-stil cuva reps+duration+assistance", () => {
    const session = inProgressSession();
    const gymResult = logSet(session, "cal-chest-push-up", "set-1", {
      weight: 20,
      reps: 8,
      completed: true,
    });
    expect(gymResult.ok).toBe(true);
    if (gymResult.ok) {
      const set = gymResult.value.exercises[0]?.sets[0];
      expect(set).toMatchObject({ weight: 20, reps: 8, durationSeconds: null, assistance: null });
    }

    const calResult = logSet(session, "cal-legs-squat", "set-1", {
      durationSeconds: 45,
      assistance: "band",
      completed: false,
    });
    expect(calResult.ok).toBe(true);
    if (calResult.ok) {
      const set = calResult.value.exercises[1]?.sets[0];
      expect(set).toMatchObject({
        weight: null,
        reps: null,
        durationSeconds: 45,
        assistance: "band",
      });
    }
  });

  it("odbija log za vezbu koja nije deo session-a", () => {
    const session = inProgressSession();
    const result = logSet(session, "ne-postoji", "set-1", { reps: 5, completed: true });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toEqual({ reason: "EXERCISE_NOT_IN_SESSION", exerciseId: "ne-postoji" });
  });

  it("odbija log kada session nije IN_PROGRESS", () => {
    const session = inProgressSession();
    const abandoned = abandonWorkoutSession(session, LATER);
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    const result = logSet(abandoned.value, "cal-chest-push-up", "set-1", {
      reps: 5,
      completed: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toEqual({ reason: "NOT_IN_PROGRESS", status: "ABANDONED" });
  });

  it("baca gresku za negativan reps/weight/duration", () => {
    const session = inProgressSession();
    expect(() =>
      logSet(session, "cal-chest-push-up", "set-1", { reps: -1, completed: true }),
    ).toThrow(RangeError);
    expect(() =>
      logSet(session, "cal-chest-push-up", "set-1", { weight: -5, completed: true }),
    ).toThrow(RangeError);
  });
});

describe("completeWorkoutSession", () => {
  function sessionWithOneCompletedSet(): WorkoutSession {
    const session = startFreeformWorkoutSession({
      id: "session-1",
      userId: USER,
      exerciseIds: ["cal-chest-push-up"],
      now: START,
    });
    const result = logSet(session, "cal-chest-push-up", "set-1", { reps: 12, completed: true });
    if (!result.ok) throw new Error("setup failed");
    return result.value;
  }

  it("odbija zavrsetak session-a bez ijedne zavrsene serije (prazan klik)", () => {
    const empty = startFreeformWorkoutSession({
      id: "session-1",
      userId: USER,
      exerciseIds: ["cal-chest-push-up"],
      now: START,
    });
    const result = completeWorkoutSession(empty, LATER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ reason: "NO_PROGRESS" });
  });

  it("zavrsava session kada postoji bar jedna zavrsena serija", () => {
    const result = completeWorkoutSession(sessionWithOneCompletedSet(), LATER);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("COMPLETED");
      expect(result.value.completedAt).toBe(LATER.toISOString());
    }
  });

  it("odbija dupli zavrsetak", () => {
    const first = completeWorkoutSession(sessionWithOneCompletedSet(), LATER);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = completeWorkoutSession(first.value, LATER);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toEqual({ reason: "ALREADY_COMPLETED" });
  });

  it("odbija zavrsetak vec napustenog session-a", () => {
    const abandoned = abandonWorkoutSession(sessionWithOneCompletedSet(), LATER);
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    const result = completeWorkoutSession(abandoned.value, LATER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ reason: "ALREADY_ABANDONED" });
  });
});

describe("abandonWorkoutSession", () => {
  it("je idempotentno na vec-ABANDONED session-u", () => {
    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: ["x"],
      now: START,
    });
    const first = abandonWorkoutSession(session, LATER);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = abandonWorkoutSession(first.value, LATER);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value).toEqual(first.value);
  });

  it("odbija napustanje vec zavrsenog session-a", () => {
    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: ["x"],
      now: START,
    });
    const logged = logSet(session, "x", "set-1", { reps: 1, completed: true });
    if (!logged.ok) throw new Error("setup failed");
    const completed = completeWorkoutSession(logged.value, LATER);
    if (!completed.ok) throw new Error("setup failed");
    const result = abandonWorkoutSession(completed.value, LATER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ reason: "ALREADY_COMPLETED" });
  });
});

describe("computeWorkoutSessionSummary", () => {
  it("sabira setove, reps, volume (weight*reps) i duration preko svih vezbi", () => {
    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: ["gym-chest-bench-press", "cal-core-plank"],
      now: START,
    });

    const afterSet1 = logSet(session, "gym-chest-bench-press", "set-1", {
      weight: 60,
      reps: 8,
      completed: true,
    });
    if (!afterSet1.ok) throw new Error("setup failed");
    const afterSet2 = logSet(afterSet1.value, "gym-chest-bench-press", "set-2", {
      weight: 60,
      reps: 6,
      completed: true,
    });
    if (!afterSet2.ok) throw new Error("setup failed");
    const afterPlank = logSet(afterSet2.value, "cal-core-plank", "set-1", {
      durationSeconds: 60,
      completed: true,
    });
    if (!afterPlank.ok) throw new Error("setup failed");

    const completed = completeWorkoutSession(afterPlank.value, LATER);
    if (!completed.ok) throw new Error("setup failed");

    const summary = computeWorkoutSessionSummary(completed.value);
    expect(summary.exerciseCount).toBe(2);
    expect(summary.totalSets).toBe(3);
    expect(summary.completedSets).toBe(3);
    expect(summary.totalReps).toBe(14);
    expect(summary.totalVolumeKg).toBe(60 * 8 + 60 * 6);
    expect(summary.totalDurationSeconds).toBe(60);
    expect(summary.durationMinutes).toBe(45);
  });

  it("durationMinutes je null dok session nije COMPLETED", () => {
    const session = startFreeformWorkoutSession({
      id: "s",
      userId: USER,
      exerciseIds: ["x"],
      now: START,
    });
    expect(computeWorkoutSessionSummary(session).durationMinutes).toBeNull();
  });
});
