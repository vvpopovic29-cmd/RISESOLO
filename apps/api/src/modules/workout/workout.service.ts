import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ExerciseResponse,
  LogWorkoutInput,
  LogWorkoutResponse,
  WorkoutResponse,
} from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import {
  mapExerciseRowToResponse,
  mapLogWorkoutResult,
  mapWorkoutRowToResponse,
} from "./workout.mapper";
import type { ExerciseRow, LogWorkoutRpcResult, WorkoutRow, WorkoutSetRow } from "./workout.types";

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

    return (data ?? []).map(mapExerciseRowToResponse);
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

    return mapLogWorkoutResult(data as LogWorkoutRpcResult);
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
