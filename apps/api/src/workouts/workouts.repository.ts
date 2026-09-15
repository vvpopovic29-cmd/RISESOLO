import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import {
  workoutSessionWithExercisesRowSchema,
  workoutTemplateWithExercisesRowSchema,
  xpEventInsertSchema,
  type WorkoutSessionRow,
  type WorkoutSessionWithExercisesRow,
  type WorkoutSetRow,
  type WorkoutTemplateWithExercisesRow,
  type XpEventInsert,
} from "@risesolo/validation";
import { SupabaseService } from "../supabase/supabase.service";

const SESSION_WITH_EXERCISES_SELECT = "*, workout_session_exercises(*, workout_sets(*))";
const TEMPLATE_WITH_EXERCISES_SELECT = "*, workout_template_exercises(*)";

@Injectable()
export class WorkoutsRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getTemplateWithExercises(templateId: string): Promise<WorkoutTemplateWithExercisesRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("workout_templates")
      .select(TEMPLATE_WITH_EXERCISES_SELECT)
      .eq("id", templateId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Workout template ${templateId} nije pronadjen`);
    }
    return workoutTemplateWithExercisesRowSchema.parse(data);
  }

  async createSession(row: {
    id: string;
    user_id: string;
    workout_template_id: string | null;
    status: string;
    started_at: string;
  }): Promise<WorkoutSessionRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("workout_sessions")
      .insert(row)
      .select("*")
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(`Neuspesno kreiranje workout session-a: ${error?.message}`);
    }
    return data as WorkoutSessionRow;
  }

  async createSessionExercises(
    rows: Array<{ session_id: string; exercise_id: string; order_index: number }>,
  ): Promise<void> {
    const { error } = await this.supabaseService.getClient().from("workout_session_exercises").insert(rows);
    if (error) {
      throw new InternalServerErrorException(`Neuspesno dodavanje vezbi u session: ${error.message}`);
    }
  }

  async getSessionWithExercises(sessionId: string): Promise<WorkoutSessionWithExercisesRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("workout_sessions")
      .select(SESSION_WITH_EXERCISES_SELECT)
      .eq("id", sessionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Workout session ${sessionId} nije pronadjen`);
    }
    return workoutSessionWithExercisesRowSchema.parse(data);
  }

  async insertSet(
    sessionExerciseId: string,
    set: {
      id: string;
      set_number: number;
      reps: number | null;
      weight: number | null;
      duration_seconds: number | null;
      assistance: string | null;
      completed: boolean;
    },
  ): Promise<WorkoutSetRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("workout_sets")
      .insert({ ...set, session_exercise_id: sessionExerciseId })
      .select("*")
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(`Neuspesno logovanje serije: ${error?.message}`);
    }
    return data as WorkoutSetRow;
  }

  /** SAMO service_role sme ovo (RLS eksplicitno blokira klijentu direktan prelaz u COMPLETED - Faza 5/6). */
  async completeSession(sessionId: string, completedAtIso: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from("workout_sessions")
      .update({ status: "COMPLETED", completed_at: completedAtIso })
      .eq("id", sessionId);

    if (error) {
      throw new InternalServerErrorException(`Neuspesno zavrsavanje session-a: ${error.message}`);
    }
  }

  /** amount mora biti > 0 (DB check constraint) - caller ne sme zvati sa 0 XP. */
  async insertXpEvent(payload: XpEventInsert): Promise<void> {
    const parsed = xpEventInsertSchema.parse(payload);
    const { error } = await this.supabaseService.getClient().from("xp_events").insert(parsed);
    if (error) {
      throw new InternalServerErrorException(`Neuspesno logovanje XP eventa: ${error.message}`);
    }
  }
}
