import { WorkoutsService } from "./workouts.service";
import type { WorkoutsRepository } from "./workouts.repository";
import type { PlayersService } from "../players/players.service";
import type { ExercisesService } from "../exercises/exercises.service";
import type { QuestsService } from "../quests/quests.service";
import type { Exercise, DailyQuest } from "@risesolo/domain";
import type {
  WorkoutSessionWithExercisesRow,
  WorkoutTemplateWithExercisesRow,
} from "@risesolo/validation";

const USER = "user-1";
const NOW = new Date("2026-09-15T12:00:00.000Z");

const PUSH_UP: Exercise = {
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
};

const QUEST: DailyQuest = {
  id: "daily-user-1-2026-09-15",
  userId: USER,
  date: "2026-09-15",
  definitionId: "def-reps",
  title: "50 ponavljanja",
  description: "Uradi 50 ponavljanja bilo koje vezbe",
  targetValue: 50,
  unit: "reps",
  progressValue: 0,
  status: "AVAILABLE",
  reward: { xp: 20 },
  createdAt: "2026-09-15T00:00:00.000Z",
  expiresAt: "2026-09-16T00:00:00.000Z",
  completedAt: null,
};

const SESSION_ROW: WorkoutSessionWithExercisesRow = {
  id: "session-1",
  user_id: USER,
  workout_template_id: null,
  status: "IN_PROGRESS",
  started_at: "2026-09-15T11:00:00.000Z",
  completed_at: null,
  workout_session_exercises: [
    {
      id: "sess-ex-1",
      session_id: "session-1",
      exercise_id: "cal-chest-push-up",
      order_index: 1,
      workout_sets: [
        {
          id: "set-1",
          session_exercise_id: "sess-ex-1",
          set_number: 1,
          reps: 10,
          weight: null,
          duration_seconds: null,
          assistance: null,
          completed: true,
          created_at: "2026-09-15T11:05:00.000Z",
        },
      ],
    },
  ],
};

const TEMPLATE_ROW: WorkoutTemplateWithExercisesRow = {
  id: "template-1",
  user_id: null,
  name: "Push Day",
  description: "",
  created_at: "2026-09-14T00:00:00.000Z",
  workout_template_exercises: [
    {
      id: "t-ex-1",
      template_id: "template-1",
      exercise_id: "cal-chest-push-up",
      order_index: 1,
      target_sets: 3,
      target_reps: "10-15",
      target_duration_seconds: null,
      rest_seconds: 45,
    },
  ],
};

function makeRepository(overrides: Partial<jest.Mocked<WorkoutsRepository>> = {}) {
  return {
    getTemplateWithExercises: jest.fn().mockResolvedValue(TEMPLATE_ROW),
    createSession: jest.fn().mockResolvedValue(SESSION_ROW),
    createSessionExercises: jest.fn().mockResolvedValue(undefined),
    getSessionWithExercises: jest.fn().mockResolvedValue(SESSION_ROW),
    insertSet: jest.fn(),
    completeSession: jest.fn().mockResolvedValue(undefined),
    insertXpEvent: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<WorkoutsRepository>;
}

function makePlayersService(overrides: Partial<jest.Mocked<PlayersService>> = {}) {
  return {
    getProgressionSnapshot: jest.fn().mockResolvedValue({
      totalXp: 0,
      coins: 0,
      streak: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    }),
    applyProgressionUpdate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<PlayersService>;
}

function makeExercisesService(exercises: Exercise[] = [PUSH_UP]) {
  return {
    list: jest.fn().mockResolvedValue(exercises),
  } as unknown as jest.Mocked<ExercisesService>;
}

function makeQuestsService(overrides: Partial<jest.Mocked<QuestsService>> = {}) {
  return {
    getOrCreateToday: jest.fn().mockResolvedValue(QUEST),
    persist: jest.fn().mockImplementation((quest) => Promise.resolve(quest)),
    ...overrides,
  } as unknown as jest.Mocked<QuestsService>;
}

function makeService(
  repository = makeRepository(),
  playersService = makePlayersService(),
  exercisesService = makeExercisesService(),
  questsService = makeQuestsService(),
) {
  return new WorkoutsService(repository, playersService, exercisesService, questsService);
}

describe("WorkoutsService.startSession", () => {
  it("kreira freeform session i upisuje session + exercises preko repository-ja", async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    const session = await service.startSession(USER, { exerciseIds: ["cal-chest-push-up"] }, NOW);

    expect(session.userId).toBe(USER);
    expect(session.workoutTemplateId).toBeNull();
    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER, workout_template_id: null, status: "IN_PROGRESS" }),
    );
    expect(repository.createSessionExercises).toHaveBeenCalledWith([
      { session_id: session.id, exercise_id: "cal-chest-push-up", order_index: 1 },
    ]);
  });

  it("kreira session iz template-a kada je template sistemski (userId null)", async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    const session = await service.startSession(USER, { templateId: "template-1" }, NOW);

    expect(session.workoutTemplateId).toBe("template-1");
    expect(repository.getTemplateWithExercises).toHaveBeenCalledWith("template-1");
  });

  it("baca ForbiddenException ako template pripada drugom korisniku", async () => {
    const repository = makeRepository({
      getTemplateWithExercises: jest
        .fn()
        .mockResolvedValue({ ...TEMPLATE_ROW, user_id: "neko-drugi" }),
    });
    const service = makeService(repository);

    await expect(
      service.startSession(USER, { templateId: "template-1" }, NOW),
    ).rejects.toThrow("Ovaj workout template ne pripada tebi");
  });

  it("baca BadRequestException kada nije prosledjen ni templateId ni exerciseIds", async () => {
    const service = makeService();
    await expect(service.startSession(USER, {}, NOW)).rejects.toThrow(
      "Mora biti prosledjen templateId ili exerciseIds",
    );
  });
});

describe("WorkoutsService.logSet", () => {
  it("loguje seriju i upisuje je preko repository-ja", async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    const session = await service.logSet(USER, "session-1", {
      exerciseId: "cal-chest-push-up",
      reps: 12,
      completed: true,
    });

    expect(session.exercises[0]?.sets).toHaveLength(2);
    expect(repository.insertSet).toHaveBeenCalledWith(
      "sess-ex-1",
      expect.objectContaining({ reps: 12, completed: true }),
    );
  });

  it("baca ForbiddenException ako session ne pripada korisniku", async () => {
    const repository = makeRepository();
    const service = makeService(repository);

    await expect(
      service.logSet("neko-drugi", "session-1", { exerciseId: "cal-chest-push-up", completed: true }),
    ).rejects.toThrow("Ovaj workout session ne pripada tebi");
  });

  it("prosledjuje domain gresku (npr. NOT_IN_PROGRESS) kao BadRequestException", async () => {
    const repository = makeRepository({
      getSessionWithExercises: jest
        .fn()
        .mockResolvedValue({ ...SESSION_ROW, status: "COMPLETED" }),
    });
    const service = makeService(repository);

    await expect(
      service.logSet(USER, "session-1", { exerciseId: "cal-chest-push-up", completed: true }),
    ).rejects.toThrow();
    expect(repository.insertSet).not.toHaveBeenCalled();
  });
});

describe("WorkoutsService.completeWorkoutSession", () => {
  it("zavrsava session, upisuje xp_events, progression i quest preko Completion Engine-a", async () => {
    const repository = makeRepository();
    const playersService = makePlayersService();
    const exercisesService = makeExercisesService();
    const questsService = makeQuestsService();
    const service = makeService(repository, playersService, exercisesService, questsService);

    const outcome = await service.completeWorkoutSession(USER, "session-1", NOW);

    expect(outcome.workoutXpGained).toBe(8); // 1 completed set * PUSH_UP.xpValue
    expect(repository.completeSession).toHaveBeenCalledWith("session-1", NOW.toISOString());
    expect(repository.insertXpEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER, source: "WORKOUT", source_id: "session-1", amount: 8 }),
    );
    expect(playersService.applyProgressionUpdate).toHaveBeenCalledWith(USER, {
      totalXp: outcome.totalXp,
      coins: outcome.totalCoins,
      streak: outcome.streak,
    });
  });

  it("azurira quest progres bez quest xp_event-a kada quest jos nije zavrsen", async () => {
    const repository = makeRepository();
    const questsService = makeQuestsService();
    const service = makeService(repository, makePlayersService(), makeExercisesService(), questsService);

    await service.completeWorkoutSession(USER, "session-1", NOW);

    const questXpCalls = repository.insertXpEvent.mock.calls.filter(
      ([payload]) => payload.source === "QUEST",
    );
    expect(questXpCalls).toHaveLength(0);
    // Quest je napredovao (10 reps od 50), ali nije zavrsen - progres se ipak upisuje preko persist().
    expect(questsService.persist).toHaveBeenCalledWith(
      expect.objectContaining({ progressValue: 10, status: "IN_PROGRESS" }),
    );
  });

  it("baca ForbiddenException ako session ne pripada korisniku", async () => {
    const service = makeService();
    await expect(service.completeWorkoutSession("neko-drugi", "session-1", NOW)).rejects.toThrow(
      "Ovaj workout session ne pripada tebi",
    );
  });

  it("prosledjuje domain gresku (NO_PROGRESS) kao BadRequestException bez upisa", async () => {
    const repository = makeRepository({
      getSessionWithExercises: jest.fn().mockResolvedValue({
        ...SESSION_ROW,
        workout_session_exercises: [
          { ...SESSION_ROW.workout_session_exercises[0], workout_sets: [] },
        ],
      }),
    });
    const service = makeService(repository);

    await expect(service.completeWorkoutSession(USER, "session-1", NOW)).rejects.toThrow();
    expect(repository.completeSession).not.toHaveBeenCalled();
  });
});
