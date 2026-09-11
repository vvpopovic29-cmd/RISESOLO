import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createChainableMock } from "../../test/supabase-query-builder.mock";
import type { PlayerRow } from "../player/player.types";
import { WorkoutService } from "./workout.service";
import type {
  ExerciseAlternativeRow,
  ExerciseRow,
  LogWorkoutRpcResult,
  WorkoutRow,
  WorkoutSetRow,
} from "./workout.types";

const baseExerciseRow: ExerciseRow = {
  id: "e1",
  name: "Squat",
  muscle_groups: ["quadriceps", "glutes"],
  equipment: "barbell",
  difficulty: "C",
  instructions: "Spusti kukove unazad i nadole drzeci ledja ravnim.",
};

const baseWorkoutRow: WorkoutRow = {
  id: "w1",
  player_id: "p1",
  performed_at: "2026-01-01T10:00:00.000Z",
  notes: null,
  created_at: "2026-01-01T10:00:00.000Z",
};

const baseWorkoutSetRow: WorkoutSetRow = {
  id: "s1",
  workout_id: "w1",
  exercise_id: "e1",
  set_number: 1,
  reps: 8,
  weight_kg: 60,
};

const basePlayerRow: PlayerRow = {
  id: "p1",
  display_name: "Vukasin",
  level: 1,
  xp: 500,
  stat_points_available: 3,
  rank: "E",
  class: null,
  coins: 20,
  hp: 100,
  strength: 1,
  agility: 1,
  endurance: 1,
  vitality: 1,
  intelligence: 1,
  current_streak: 1,
  longest_streak: 1,
  last_activity_date: "2026-01-01",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T10:00:00.000Z",
};

describe("WorkoutService", () => {
  describe("listExercises", () => {
    it("vraca mapiranu listu vezbi sa alternativama grupisanim po vezbi", async () => {
      const alternativeRow: ExerciseAlternativeRow = {
        exercise_id: "e1",
        alternative_exercise_id: "e2",
      };
      const exercisesBuilder = createChainableMock({ data: [baseExerciseRow], error: null });
      const alternativesBuilder = createChainableMock({ data: [alternativeRow], error: null });
      const from = jest
        .fn()
        .mockReturnValueOnce(exercisesBuilder)
        .mockReturnValueOnce(alternativesBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.listExercises();

      expect(result).toEqual([
        {
          id: "e1",
          name: "Squat",
          muscleGroups: ["quadriceps", "glutes"],
          equipment: "barbell",
          difficulty: "C",
          instructions: "Spusti kukove unazad i nadole drzeci ledja ravnim.",
          alternativeExerciseIds: ["e2"],
        },
      ]);
    });
  });

  describe("getExerciseProgress", () => {
    it("vraca insufficient_data kada igrac nema treninge", async () => {
      const builder = createChainableMock({ data: [], error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.getExerciseProgress("p1", "e1");

      expect(result).toEqual({
        exerciseId: "e1",
        sessions: [],
        trend: "insufficient_data",
        stagnationStatus: "insufficient_data",
      });
    });

    it("grupise serije po treningu hronoloski i racuna trend preko domain sloja", async () => {
      const workoutsBuilder = createChainableMock({
        data: [
          { id: "w1", performed_at: "2026-01-01T10:00:00.000Z" },
          { id: "w2", performed_at: "2026-01-08T10:00:00.000Z" },
        ],
        error: null,
      });
      const setsBuilder = createChainableMock({
        data: [
          { id: "s1", workout_id: "w1", exercise_id: "e1", set_number: 1, reps: 8, weight_kg: 60 },
          { id: "s2", workout_id: "w2", exercise_id: "e1", set_number: 1, reps: 8, weight_kg: 65 },
        ],
        error: null,
      });
      const from = jest.fn().mockReturnValueOnce(workoutsBuilder).mockReturnValueOnce(setsBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.getExerciseProgress("p1", "e1");

      expect(result.exerciseId).toBe("e1");
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0]?.workoutId).toBe("w1");
      expect(result.sessions[1]?.workoutId).toBe("w2");
      expect(result.trend).toBe("up");
      expect(result.stagnationStatus).toBe("insufficient_data");
    });

    it("racuna stagnationStatus preko poslednje 3 sesije kada ih ima dovoljno", async () => {
      const workoutsBuilder = createChainableMock({
        data: [
          { id: "w1", performed_at: "2026-01-01T10:00:00.000Z" },
          { id: "w2", performed_at: "2026-01-08T10:00:00.000Z" },
          { id: "w3", performed_at: "2026-01-15T10:00:00.000Z" },
        ],
        error: null,
      });
      const setsBuilder = createChainableMock({
        data: [
          { id: "s1", workout_id: "w1", exercise_id: "e1", set_number: 1, reps: 8, weight_kg: 60 },
          { id: "s2", workout_id: "w2", exercise_id: "e1", set_number: 1, reps: 8, weight_kg: 65 },
          { id: "s3", workout_id: "w3", exercise_id: "e1", set_number: 1, reps: 8, weight_kg: 70 },
        ],
        error: null,
      });
      const from = jest.fn().mockReturnValueOnce(workoutsBuilder).mockReturnValueOnce(setsBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.getExerciseProgress("p1", "e1");

      expect(result.stagnationStatus).toBe("progressing");
    });
  });

  describe("logWorkout", () => {
    it("prosledjuje sets u snake_case obliku RPC-u i mapira rezultat", async () => {
      const rpcResult: LogWorkoutRpcResult = {
        workout_id: "w1",
        personal_records_count: 1,
        new_personal_records: [{ exercise_id: "e1", weight_kg: 65, reps: 8 }],
        player: basePlayerRow,
      };
      const rpc = jest.fn().mockResolvedValue({ data: rpcResult, error: null });
      const planBuilder = createChainableMock({ data: null, error: null });
      const supabase = {
        from: jest.fn(() => planBuilder),
        rpc,
      } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.logWorkout("p1", {
        notes: "Dobar trening",
        sets: [{ exerciseId: "e1", setNumber: 1, reps: 8, weightKg: 65 }],
      });

      expect(rpc).toHaveBeenCalledWith("fn_log_workout", {
        p_player_id: "p1",
        p_sets: [{ exercise_id: "e1", set_number: 1, reps: 8, weight_kg: 65 }],
        p_notes: "Dobar trening",
      });
      expect(result.workoutId).toBe("w1");
      expect(result.personalRecordsCount).toBe(1);
      expect(result.newPersonalRecords).toEqual([{ exerciseId: "e1", weightKg: 65, reps: 8 }]);
      expect(result.player.displayName).toBe("Vukasin");
      expect(result.restDayWarning).toBe(false);
    });

    it("baca BadRequestException kada RPC vrati gresku (npr. nevalidan set)", async () => {
      const rpc = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "invalid workout set payload" } });
      const supabase = { from: jest.fn(), rpc } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      await expect(
        service.logWorkout("p1", { sets: [{ exerciseId: "e1", reps: 8, weightKg: 65 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it("restDayWarning je true kada igracev Training Plan kaze da je danas 'rest'", async () => {
      const rpcResult: LogWorkoutRpcResult = {
        workout_id: "w1",
        personal_records_count: 0,
        new_personal_records: [],
        player: basePlayerRow,
      };
      const rpc = jest.fn().mockResolvedValue({ data: rpcResult, error: null });
      const todayIndex = (new Date().getUTCDay() + 6) % 7;
      const schedule = Array(7).fill("push");
      schedule[todayIndex] = "rest";
      const planBuilder = createChainableMock({ data: { schedule }, error: null });
      const supabase = {
        from: jest.fn(() => planBuilder),
        rpc,
      } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.logWorkout("p1", {
        sets: [{ exerciseId: "e1", reps: 8, weightKg: 65 }],
      });

      expect(result.restDayWarning).toBe(true);
    });
  });

  describe("listWorkouts", () => {
    it("vraca mapiranu listu treninga bez detalja o serijama", async () => {
      const builder = createChainableMock({ data: [baseWorkoutRow], error: null });
      const supabase = {
        from: jest.fn(() => builder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.listWorkouts("p1");

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("w1");
      expect(result[0]?.sets).toBeUndefined();
    });
  });

  describe("getWorkout", () => {
    it("vraca trening sa serijama kada pripada pozivaocu", async () => {
      const workoutBuilder = createChainableMock({ data: baseWorkoutRow, error: null });
      const setsBuilder = createChainableMock({ data: [baseWorkoutSetRow], error: null });
      const from = jest.fn().mockReturnValueOnce(workoutBuilder).mockReturnValueOnce(setsBuilder);
      const supabase = { from, rpc: jest.fn() } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      const result = await service.getWorkout("p1", "w1");

      expect(result.id).toBe("w1");
      expect(result.sets).toEqual([
        { id: "s1", exerciseId: "e1", setNumber: 1, reps: 8, weightKg: 60 },
      ]);
    });

    it("baca NotFoundException kada trening ne postoji ili ne pripada pozivaocu", async () => {
      const workoutBuilder = createChainableMock({ data: null, error: null });
      const supabase = {
        from: jest.fn(() => workoutBuilder),
        rpc: jest.fn(),
      } as unknown as SupabaseClient;
      const service = new WorkoutService(supabase);

      await expect(service.getWorkout("p1", "missing")).rejects.toThrow(NotFoundException);
    });
  });
});
