import { selectCandidateExercises, type CandidateExercise } from "./candidates";

function exercise(overrides: Partial<CandidateExercise>): CandidateExercise {
  return {
    slug: "test-exercise",
    name: "Test Exercise",
    category: "CHEST",
    type: "CALISTHENICS",
    difficulty: "BEGINNER",
    movementPattern: "push",
    ...overrides,
  };
}

describe("selectCandidateExercises", () => {
  it("bez filtera vraca sve vezbe (do maxPerCategory po kategoriji)", () => {
    const exercises = [
      exercise({ slug: "a", category: "CHEST" }),
      exercise({ slug: "b", category: "BACK" }),
    ];

    expect(selectCandidateExercises(exercises).map((e) => e.slug)).toEqual(["a", "b"]);
  });

  it("filtrira po trainingType", () => {
    const exercises = [
      exercise({ slug: "calisthenics-1", type: "CALISTHENICS" }),
      exercise({ slug: "gym-1", type: "GYM" }),
    ];

    expect(
      selectCandidateExercises(exercises, { trainingType: "GYM" }).map((e) => e.slug),
    ).toEqual(["gym-1"]);
  });

  it("iskljucuje vezbe teze od experienceLevel", () => {
    const exercises = [
      exercise({ slug: "beginner", difficulty: "BEGINNER" }),
      exercise({ slug: "intermediate", difficulty: "INTERMEDIATE" }),
      exercise({ slug: "advanced", difficulty: "ADVANCED" }),
    ];

    expect(
      selectCandidateExercises(exercises, { experienceLevel: "INTERMEDIATE" }).map((e) => e.slug),
    ).toEqual(["beginner", "intermediate"]);
  });

  it("ogranicava broj vezbi po kategoriji na maxPerCategory", () => {
    const exercises = [
      exercise({ slug: "chest-1", category: "CHEST" }),
      exercise({ slug: "chest-2", category: "CHEST" }),
      exercise({ slug: "chest-3", category: "CHEST" }),
    ];

    expect(
      selectCandidateExercises(exercises, { maxPerCategory: 2 }).map((e) => e.slug),
    ).toEqual(["chest-1", "chest-2"]);
  });

  it("kombinuje sve filtere istovremeno", () => {
    const exercises = [
      exercise({ slug: "ok", type: "GYM", difficulty: "BEGINNER", category: "LEGS" }),
      exercise({ slug: "wrong-type", type: "CALISTHENICS", difficulty: "BEGINNER", category: "LEGS" }),
      exercise({ slug: "too-hard", type: "GYM", difficulty: "ADVANCED", category: "LEGS" }),
    ];

    expect(
      selectCandidateExercises(exercises, {
        trainingType: "GYM",
        experienceLevel: "BEGINNER",
      }).map((e) => e.slug),
    ).toEqual(["ok"]);
  });
});
