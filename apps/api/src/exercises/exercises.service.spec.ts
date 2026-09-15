import { ExercisesService } from "./exercises.service";
import type { ExercisesRepository } from "./exercises.repository";
import type { Exercise } from "@risesolo/domain";

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
    xpValue: 8,
    media: { thumbnailUrl: null, videoUrl: null, gifUrl: null },
    tags: [],
    ...overrides,
  };
}

const PUSH_UP = makeExercise({ id: "cal-chest-push-up", category: "CHEST", difficulty: "BEGINNER" });
const SQUAT = makeExercise({
  id: "cal-legs-squat",
  category: "LEGS",
  difficulty: "BEGINNER",
});
const ONE_ARM = makeExercise({
  id: "cal-chest-one-arm-push-up",
  category: "CHEST",
  difficulty: "ADVANCED",
});

describe("ExercisesService.list", () => {
  function makeService(exercises: Exercise[]) {
    const repository = {
      listAll: jest.fn().mockResolvedValue(exercises),
    } as unknown as ExercisesRepository;
    return new ExercisesService(repository);
  }

  it("vraca ceo katalog bez filtera", async () => {
    const service = makeService([PUSH_UP, SQUAT, ONE_ARM]);
    await expect(service.list({})).resolves.toHaveLength(3);
  });

  it("filtrira po category preko @risesolo/domain filterExercisesByCategory", async () => {
    const service = makeService([PUSH_UP, SQUAT, ONE_ARM]);
    const result = await service.list({ category: "CHEST" });
    expect(result).toEqual([PUSH_UP, ONE_ARM]);
  });

  it("kombinuje category + difficulty filtere", async () => {
    const service = makeService([PUSH_UP, SQUAT, ONE_ARM]);
    const result = await service.list({ category: "CHEST", difficulty: "ADVANCED" });
    expect(result).toEqual([ONE_ARM]);
  });
});
