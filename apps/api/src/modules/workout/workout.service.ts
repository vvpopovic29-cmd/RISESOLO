import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { training } from "@risesolo/domain";
import type {
  DayFocus,
  ExerciseProgressResponse,
  ExerciseProgressSession,
  ExerciseResponse,
  LogWorkoutInput,
  LogWorkoutResponse,
  StagnationSummaryResponse,
  WorkoutResponse,
} from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import {
  mapExerciseRowToResponse,
  mapLogWorkoutResult,
  mapWorkoutRowToResponse,
} from "./workout.mapper";
import type {
  ExerciseAlternativeRow,
  ExerciseRow,
  LogWorkoutRpcResult,
  WorkoutRow,
  WorkoutSetRow,
} from "./workout.types";

@Injectable()
export class WorkoutService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listExercises(): Promise<ExerciseResponse[]> {
    const { data, error } = await this.supabase
      .from("exercises")
      .select("*")
      .order("name", { ascending: true })
      .returns<ExerciseRow[]>();

    if (error) {
      throw new InternalServerErrorException(`Ucitavanje vezbi nije uspelo: ${error.message}`);
    }

    const { data: alternatives, error: alternativesError } = await this.supabase
      .from("exercise_alternatives")
      .select("*")
      .returns<ExerciseAlternativeRow[]>();

    if (alternativesError) {
      throw new InternalServerErrorException(
        `Ucitavanje alternativnih vezbi nije uspelo: ${alternativesError.message}`,
      );
    }

    const alternativesByExercise = groupAlternativesByExercise(alternatives ?? []);

    return (data ?? []).map((row) =>
      mapExerciseRowToResponse(row, alternativesByExercise.get(row.id) ?? []),
    );
  }

  /**
   * Progressive Overload signal za jednu vezbu - grupise serije po
   * treningu (hronoloski), pa poredi poslednje dve sesije preko
   * `@risesolo/domain` cistih funkcija (Epley 1RM procena). Servis samo
   * dovlaci i grupise podatke; sam izracun trenda je u domain sloju.
   */
  async getExerciseProgress(
    playerId: string,
    exerciseId: string,
  ): Promise<ExerciseProgressResponse> {
    const { data: workouts, error: workoutsError } = await this.supabase
      .from("workouts")
      .select("id, performed_at")
      .eq("player_id", playerId)
      .order("performed_at", { ascending: true })
      .returns<Array<Pick<WorkoutRow, "id" | "performed_at">>>();

    if (workoutsError) {
      throw new InternalServerErrorException(
        `Ucitavanje treninga nije uspelo: ${workoutsError.message}`,
      );
    }

    const workoutIds = (workouts ?? []).map((workout) => workout.id);
    if (workoutIds.length === 0) {
      return {
        exerciseId,
        sessions: [],
        trend: "insufficient_data",
        stagnationStatus: "insufficient_data",
      };
    }

    const { data: sets, error: setsError } = await this.supabase
      .from("workout_sets")
      .select("*")
      .eq("exercise_id", exerciseId)
      .in("workout_id", workoutIds)
      .returns<WorkoutSetRow[]>();

    if (setsError) {
      throw new InternalServerErrorException(`Ucitavanje serija nije uspelo: ${setsError.message}`);
    }

    const setsByWorkoutId = new Map<string, WorkoutSetRow[]>();
    for (const set of sets ?? []) {
      const existing = setsByWorkoutId.get(set.workout_id) ?? [];
      existing.push(set);
      setsByWorkoutId.set(set.workout_id, existing);
    }

    const sessions: ExerciseProgressSession[] = [];
    for (const workout of workouts ?? []) {
      const workoutSets = setsByWorkoutId.get(workout.id);
      if (!workoutSets || workoutSets.length === 0) {
        continue;
      }

      sessions.push({
        workoutId: workout.id,
        performedAt: workout.performed_at,
        sets: workoutSets.map((set) => ({
          setNumber: set.set_number,
          reps: set.reps,
          weightKg: set.weight_kg,
        })),
        topEstimated1Rm: training.topEstimated1Rm(
          workoutSets.map((set) => ({ weightKg: set.weight_kg, reps: set.reps })),
        ),
      });
    }

    const sessionSets = sessions.map((session) =>
      session.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
    );
    const trend = training.computeProgressTrend(sessionSets);
    const stagnationStatus = training.detectStagnation(sessionSets);

    return { exerciseId, sessions, trend, stagnationStatus };
  }

  /**
   * Faza 15: proaktivan System AI signal - agregira `training.detectStagnation`
   * preko SVIH vezbi koje je igrac ikad trenirao (ne samo jedne, kao
   * `getExerciseProgress`), da bi se moglo prikazati upozorenje na System
   * Status (home) ekranu umesto da korisnik mora sam da otvori svaku vezbu.
   */
  async getStagnationSummary(playerId: string): Promise<StagnationSummaryResponse> {
    const { data: workouts, error: workoutsError } = await this.supabase
      .from("workouts")
      .select("id, performed_at")
      .eq("player_id", playerId)
      .order("performed_at", { ascending: true })
      .returns<Array<Pick<WorkoutRow, "id" | "performed_at">>>();

    if (workoutsError) {
      throw new InternalServerErrorException(
        `Ucitavanje treninga nije uspelo: ${workoutsError.message}`,
      );
    }

    const workoutIds = (workouts ?? []).map((workout) => workout.id);
    if (workoutIds.length === 0) {
      return { stagnantExercises: [], regressingExercises: [], deloadRecommended: false };
    }

    const { data: sets, error: setsError } = await this.supabase
      .from("workout_sets")
      .select("*")
      .in("workout_id", workoutIds)
      .returns<WorkoutSetRow[]>();

    if (setsError) {
      throw new InternalServerErrorException(`Ucitavanje serija nije uspelo: ${setsError.message}`);
    }

    const performedAtByWorkoutId = new Map(
      (workouts ?? []).map((workout) => [workout.id, workout.performed_at]),
    );

    const setsByExerciseThenWorkout = new Map<string, Map<string, WorkoutSetRow[]>>();
    for (const set of sets ?? []) {
      const byWorkout = setsByExerciseThenWorkout.get(set.exercise_id) ?? new Map();
      const workoutSets = byWorkout.get(set.workout_id) ?? [];
      workoutSets.push(set);
      byWorkout.set(set.workout_id, workoutSets);
      setsByExerciseThenWorkout.set(set.exercise_id, byWorkout);
    }

    const stagnatingExerciseIds: string[] = [];
    const regressingExerciseIds: string[] = [];
    for (const [exerciseId, byWorkout] of setsByExerciseThenWorkout) {
      const sessions = [...byWorkout.entries()]
        .sort(([workoutIdA], [workoutIdB]) => {
          const a = performedAtByWorkoutId.get(workoutIdA) ?? "";
          const b = performedAtByWorkoutId.get(workoutIdB) ?? "";
          return a.localeCompare(b);
        })
        .map(([, workoutSets]) =>
          workoutSets.map((set) => ({ weightKg: set.weight_kg, reps: set.reps })),
        );

      const status = training.detectStagnation(sessions);
      if (status === "stagnating") {
        stagnatingExerciseIds.push(exerciseId);
      } else if (status === "regressing") {
        regressingExerciseIds.push(exerciseId);
      }
    }

    const deloadRecommended = training.shouldRecommendDeload(regressingExerciseIds.length);

    const relevantExerciseIds = [...stagnatingExerciseIds, ...regressingExerciseIds];
    if (relevantExerciseIds.length === 0) {
      return { stagnantExercises: [], regressingExercises: [], deloadRecommended };
    }

    const { data: exercises, error: exercisesError } = await this.supabase
      .from("exercises")
      .select("id, name")
      .in("id", relevantExerciseIds)
      .returns<Array<Pick<ExerciseRow, "id" | "name">>>();

    if (exercisesError) {
      throw new InternalServerErrorException(
        `Ucitavanje vezbi nije uspelo: ${exercisesError.message}`,
      );
    }

    const nameById = new Map((exercises ?? []).map((exercise) => [exercise.id, exercise.name]));

    return {
      stagnantExercises: stagnatingExerciseIds.map((exerciseId) => ({
        exerciseId,
        exerciseName: nameById.get(exerciseId) ?? exerciseId,
      })),
      regressingExercises: regressingExerciseIds.map((exerciseId) => ({
        exerciseId,
        exerciseName: nameById.get(exerciseId) ?? exerciseId,
      })),
      deloadRecommended,
    };
  }

  /**
   * Beleži trening (sve serije u jednom pozivu) kroz fn_log_workout -
   * PR detekcija, XP grant, progres povezanih questova i streak se
   * izracunavaju atomski u bazi, ne ovde. Backend samo prosledjuje
   * validirani ulaz i mapira rezultat.
   */
  async logWorkout(playerId: string, input: LogWorkoutInput): Promise<LogWorkoutResponse> {
    const sets = input.sets.map((set) => ({
      exercise_id: set.exerciseId,
      set_number: set.setNumber,
      reps: set.reps,
      weight_kg: set.weightKg,
    }));

    const { data, error } = await this.supabase.rpc("fn_log_workout", {
      p_player_id: playerId,
      p_sets: sets,
      p_notes: input.notes ?? null,
    });

    if (error) {
      throw new BadRequestException(`Beleženje treninga nije uspelo: ${error.message}`);
    }

    const restDayWarning = await this.isTodayRestDay(playerId);

    return mapLogWorkoutResult(data as LogWorkoutRpcResult, restDayWarning);
  }

  /**
   * Cita igracev Training Plan (ako postoji) i proverava da li je danasnji
   * fokus 'rest' - isti obrazac citanja kao QuestService.getTodaysPlannedFocus,
   * samo ovde 'rest' je sam signal koji nas zanima (ne kolapsira se u null).
   */
  private async isTodayRestDay(playerId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("training_plans")
      .select("schedule")
      .eq("player_id", playerId)
      .maybeSingle<{ schedule: DayFocus[] }>();

    if (error) {
      throw new InternalServerErrorException(
        `Ucitavanje training plana nije uspelo: ${error.message}`,
      );
    }
    if (!data) {
      return false;
    }

    const todayIndex = (new Date().getUTCDay() + 6) % 7;
    return data.schedule[todayIndex] === "rest";
  }

  async listWorkouts(playerId: string): Promise<WorkoutResponse[]> {
    const { data, error } = await this.supabase
      .from("workouts")
      .select("*")
      .eq("player_id", playerId)
      .order("performed_at", { ascending: false })
      .returns<WorkoutRow[]>();

    if (error) {
      throw new InternalServerErrorException(`Ucitavanje treninga nije uspelo: ${error.message}`);
    }

    return (data ?? []).map((row) => mapWorkoutRowToResponse(row));
  }

  async getWorkout(playerId: string, workoutId: string): Promise<WorkoutResponse> {
    const { data: workout, error: workoutError } = await this.supabase
      .from("workouts")
      .select("*")
      .eq("id", workoutId)
      .eq("player_id", playerId)
      .maybeSingle<WorkoutRow>();

    if (workoutError) {
      throw new InternalServerErrorException(
        `Ucitavanje treninga nije uspelo: ${workoutError.message}`,
      );
    }
    if (!workout) {
      throw new NotFoundException("Trening ne postoji");
    }

    const { data: sets, error: setsError } = await this.supabase
      .from("workout_sets")
      .select("*")
      .eq("workout_id", workoutId)
      .order("set_number", { ascending: true })
      .returns<WorkoutSetRow[]>();

    if (setsError) {
      throw new InternalServerErrorException(`Ucitavanje serija nije uspelo: ${setsError.message}`);
    }

    return mapWorkoutRowToResponse(workout, sets ?? []);
  }
}

function groupAlternativesByExercise(rows: ExerciseAlternativeRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const existing = grouped.get(row.exercise_id) ?? [];
    existing.push(row.alternative_exercise_id);
    grouped.set(row.exercise_id, existing);
  }
  return grouped;
}
