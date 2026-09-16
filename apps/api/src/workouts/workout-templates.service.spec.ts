import { NotFoundException } from "@nestjs/common";
import type { ExerciseDto } from "@risesolo/validation";
import type { ExercisesService } from "../exercises/exercises.service";
import type { PrismaService } from "../prisma/prisma.service";
import { WorkoutTemplatesService } from "./workout-templates.service";

function makeExercise(id: string, name: string): ExerciseDto {
  return {
    id,
    slug: id,
    name,
    category: "PUSH",
    subcategory: null,
    type: "CALISTHENICS",
    difficulty: "BEGINNER",
    equipment: "Bodyweight",
    movementPattern: "PUSH",
    primaryMuscles: [],
    secondaryMuscles: [],
    instructions: [],
    formCues: [],
    safetyNotes: [],
    defaultSets: null,
    defaultReps: null,
    holdSeconds: null,
    restSeconds: null,
    progressionChain: null,
    progressionOrder: null,
  };
}

function makeExercisesService(exercises: ExerciseDto[]): ExercisesService {
  return {
    findManyByIds: jest.fn().mockImplementation((ids: string[]) =>
      Promise.resolve(exercises.filter((exercise) => ids.includes(exercise.id))),
    ),
  } as unknown as ExercisesService;
}

function makePrisma(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    workout: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("WorkoutTemplatesService", () => {
  describe("create", () => {
    it("odbacuje kreiranje ako neka vezba ne postoji", async () => {
      const exercisesService = makeExercisesService([makeExercise("ex-1", "Sklekovi")]);
      const prisma = makePrisma();
      const service = new WorkoutTemplatesService(prisma, exercisesService);

      await expect(
        service.create("user-1", { name: "Push dan", exercises: [{ exerciseId: "ex-1" }, { exerciseId: "unknown" }] }),
      ).rejects.toThrow("Jedna ili vise vezbi ne postoje");
      expect(prisma.workout.create).not.toHaveBeenCalled();
    });

    it("kreira template sa order-om izvedenim iz pozicije u nizu", async () => {
      const exercisesService = makeExercisesService([makeExercise("ex-1", "Sklekovi"), makeExercise("ex-2", "Cucnjevi")]);
      const prisma = makePrisma({
        workout: {
          create: jest.fn().mockResolvedValue({
            id: "workout-1",
            userId: "user-1",
            name: "Push dan",
            createdAt: new Date("2026-01-01"),
            exercises: [
              { id: "te-1", workoutId: "workout-1", exerciseId: "ex-1", order: 1, targetSets: 3 },
              { id: "te-2", workoutId: "workout-1", exerciseId: "ex-2", order: 2, targetSets: null },
            ],
          }),
        },
      });
      const service = new WorkoutTemplatesService(prisma, exercisesService);

      const result = await service.create("user-1", {
        name: "Push dan",
        exercises: [{ exerciseId: "ex-1", targetSets: 3 }, { exerciseId: "ex-2" }],
      });

      expect(prisma.workout.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          name: "Push dan",
          exercises: {
            create: [
              { exerciseId: "ex-1", order: 1, targetSets: 3 },
              { exerciseId: "ex-2", order: 2, targetSets: null },
            ],
          },
        },
        include: { exercises: true },
      });
      expect(result.exercises).toEqual([
        { order: 1, targetSets: 3, exercise: expect.objectContaining({ id: "ex-1" }) },
        { order: 2, targetSets: null, exercise: expect.objectContaining({ id: "ex-2" }) },
      ]);
    });
  });

  describe("list", () => {
    it("vraca summary sa exerciseCount preko _count", async () => {
      const prisma = makePrisma({
        workout: {
          findMany: jest.fn().mockResolvedValue([
            { id: "w-1", name: "Push dan", createdAt: new Date("2026-01-02"), _count: { exercises: 3 } },
          ]),
        },
      });
      const service = new WorkoutTemplatesService(prisma, makeExercisesService([]));

      const result = await service.list("user-1");

      expect(result).toEqual([{ id: "w-1", name: "Push dan", exerciseCount: 3, createdAt: "2026-01-02T00:00:00.000Z" }]);
    });
  });

  describe("getById", () => {
    it("baca 404 kada template ne postoji", async () => {
      const prisma = makePrisma({ workout: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new WorkoutTemplatesService(prisma, makeExercisesService([]));

      await expect(service.getById("user-1", "missing")).rejects.toThrow(NotFoundException);
    });

    it("baca 404 kada template pripada drugom korisniku (ne curi informaciju)", async () => {
      const prisma = makePrisma({
        workout: { findUnique: jest.fn().mockResolvedValue({ id: "w-1", userId: "someone-else", exercises: [] }) },
      });
      const service = new WorkoutTemplatesService(prisma, makeExercisesService([]));

      await expect(service.getById("user-1", "w-1")).rejects.toThrow(NotFoundException);
    });

    it("hidrira i sortira vezbe po order-u", async () => {
      const exercisesService = makeExercisesService([makeExercise("ex-1", "Sklekovi"), makeExercise("ex-2", "Cucnjevi")]);
      const prisma = makePrisma({
        workout: {
          findUnique: jest.fn().mockResolvedValue({
            id: "w-1",
            userId: "user-1",
            name: "Push dan",
            createdAt: new Date("2026-01-01"),
            exercises: [
              { exerciseId: "ex-2", order: 2, targetSets: null },
              { exerciseId: "ex-1", order: 1, targetSets: 3 },
            ],
          }),
        },
      });
      const service = new WorkoutTemplatesService(prisma, exercisesService);

      const result = await service.getById("user-1", "w-1");

      expect(result.exercises.map((e) => e.order)).toEqual([1, 2]);
      expect(result.exercises[0]?.exercise?.id).toBe("ex-1");
    });
  });

  describe("delete", () => {
    it("baca 404 kada template pripada drugom korisniku", async () => {
      const prisma = makePrisma({
        workout: {
          findUnique: jest.fn().mockResolvedValue({ id: "w-1", userId: "someone-else" }),
          delete: jest.fn(),
        },
      });
      const service = new WorkoutTemplatesService(prisma, makeExercisesService([]));

      await expect(service.delete("user-1", "w-1")).rejects.toThrow(NotFoundException);
      expect(prisma.workout.delete).not.toHaveBeenCalled();
    });

    it("brise template kada je vlasnik", async () => {
      const prisma = makePrisma({
        workout: {
          findUnique: jest.fn().mockResolvedValue({ id: "w-1", userId: "user-1" }),
          delete: jest.fn().mockResolvedValue(undefined),
        },
      });
      const service = new WorkoutTemplatesService(prisma, makeExercisesService([]));

      await service.delete("user-1", "w-1");

      expect(prisma.workout.delete).toHaveBeenCalledWith({ where: { id: "w-1" } });
    });
  });
});
