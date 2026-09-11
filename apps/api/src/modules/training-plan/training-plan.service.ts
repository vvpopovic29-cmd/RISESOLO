import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { training } from "@risesolo/domain";
import type { TrainingPlanResponse, UpdateTrainingPlanInput } from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import { mapTrainingPlanRowToResponse } from "./training-plan.mapper";
import type { TrainingPlanRow } from "./training-plan.types";

@Injectable()
export class TrainingPlanService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async getPlan(playerId: string): Promise<TrainingPlanResponse> {
    const { data, error } = await this.supabase
      .from("training_plans")
      .select("*")
      .eq("player_id", playerId)
      .maybeSingle<TrainingPlanRow>();

    if (error) {
      throw new InternalServerErrorException(
        `Ucitavanje training plana nije uspelo: ${error.message}`,
      );
    }

    return mapTrainingPlanRowToResponse(data);
  }

  /**
   * Generise 7-dnevni raspored preko `@risesolo/domain` (cist izracun, ne
   * zavisi od baze) i cuva ga kroz `fn_upsert_training_plan`. Klijent bira
   * samo splitType/daysPerWeek - sam raspored je uvek izveden, nikad
   * primljen direktno sa klijenta.
   */
  async updatePlan(
    playerId: string,
    input: UpdateTrainingPlanInput,
  ): Promise<TrainingPlanResponse> {
    const schedule = training.generateWeeklySchedule(input.splitType, input.daysPerWeek);

    const { data, error } = await this.supabase.rpc("fn_upsert_training_plan", {
      p_player_id: playerId,
      p_split_type: input.splitType,
      p_days_per_week: input.daysPerWeek,
      p_schedule: schedule,
    });

    if (error) {
      throw new BadRequestException(`Azuriranje training plana nije uspelo: ${error.message}`);
    }

    return mapTrainingPlanRowToResponse(data as TrainingPlanRow);
  }
}
