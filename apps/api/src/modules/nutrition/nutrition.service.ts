import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { nutrition } from "@risesolo/domain";
import type {
  LogMealInput,
  LogWaterInput,
  MealLogResponse,
  NutritionDailySummary,
  NutritionTargets,
  UpdateNutritionTargetsInput,
  WaterLogResponse,
} from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import {
  mapMealLogRowToResponse,
  mapNutritionTargetsRowToResponse,
  mapWaterLogRowToResponse,
} from "./nutrition.mapper";
import type {
  MealLogRow,
  NutritionDailyBonusRow,
  NutritionTargetsRow,
  WaterLogRow,
} from "./nutrition.types";

@Injectable()
export class NutritionService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async getTargets(playerId: string): Promise<NutritionTargets> {
    const { data, error } = await this.supabase
      .from("nutrition_targets")
      .select("*")
      .eq("player_id", playerId)
      .maybeSingle<NutritionTargetsRow>();

    if (error) {
      throw new InternalServerErrorException(
        `Ucitavanje nutricionih ciljeva nije uspelo: ${error.message}`,
      );
    }

    return mapNutritionTargetsRowToResponse(data);
  }

  /**
   * Delimicno azuriranje - izostavljeno polje ostaje nepromenjeno
   * (fn_upsert_nutrition_targets radi COALESCE sa postojecom vrednoscu
   * pri insert-on-conflict-update).
   */
  async updateTargets(
    playerId: string,
    input: UpdateNutritionTargetsInput,
  ): Promise<NutritionTargets> {
    const { data, error } = await this.supabase.rpc("fn_upsert_nutrition_targets", {
      p_player_id: playerId,
      p_calorie_target: input.calorieTarget ?? null,
      p_protein_target_g: input.proteinTargetG ?? null,
      p_carb_target_g: input.carbTargetG ?? null,
      p_fat_target_g: input.fatTargetG ?? null,
      p_water_target_ml: input.waterTargetMl ?? null,
    });

    if (error) {
      throw new BadRequestException(`Azuriranje nutricionih ciljeva nije uspelo: ${error.message}`);
    }

    return mapNutritionTargetsRowToResponse(data as NutritionTargetsRow);
  }

  async logMeal(playerId: string, input: LogMealInput): Promise<MealLogResponse> {
    const { data, error } = await this.supabase.rpc("fn_log_meal", {
      p_player_id: playerId,
      p_name: input.name,
      p_calories: input.calories,
      p_protein_g: input.proteinG,
      p_carbs_g: input.carbsG,
      p_fat_g: input.fatG,
    });

    if (error) {
      throw new BadRequestException(`Beleženje obroka nije uspelo: ${error.message}`);
    }

    return mapMealLogRowToResponse(data as MealLogRow);
  }

  async logWater(playerId: string, input: LogWaterInput): Promise<WaterLogResponse> {
    const { data, error } = await this.supabase.rpc("fn_log_water", {
      p_player_id: playerId,
      p_amount_ml: input.amountMl,
    });

    if (error) {
      throw new BadRequestException(`Beleženje unosa vode nije uspelo: ${error.message}`);
    }

    return mapWaterLogRowToResponse(data as WaterLogRow);
  }

  /** `date` je YYYY-MM-DD (UTC); podrazumevano danasnji dan. Vec validiran Zod regex-om na kontroleru. */
  async getDailySummary(playerId: string, date?: string): Promise<NutritionDailySummary> {
    const { dayStart, dayEnd, dateKey } = getUtcDayWindow(date);

    const { data: meals, error: mealsError } = await this.supabase
      .from("meal_logs")
      .select("*")
      .eq("player_id", playerId)
      .gte("logged_at", dayStart.toISOString())
      .lt("logged_at", dayEnd.toISOString())
      .order("logged_at", { ascending: true })
      .returns<MealLogRow[]>();

    if (mealsError) {
      throw new InternalServerErrorException(
        `Ucitavanje obroka nije uspelo: ${mealsError.message}`,
      );
    }

    const { data: waterLogs, error: waterError } = await this.supabase
      .from("water_logs")
      .select("*")
      .eq("player_id", playerId)
      .gte("logged_at", dayStart.toISOString())
      .lt("logged_at", dayEnd.toISOString())
      .order("logged_at", { ascending: true })
      .returns<WaterLogRow[]>();

    if (waterError) {
      throw new InternalServerErrorException(
        `Ucitavanje unosa vode nije uspelo: ${waterError.message}`,
      );
    }

    const targets = await this.getTargets(playerId);
    const mealRows = meals ?? [];
    const waterRows = waterLogs ?? [];

    const totals = {
      calories: mealRows.reduce((sum, meal) => sum + meal.calories, 0),
      proteinG: mealRows.reduce((sum, meal) => sum + meal.protein_g, 0),
      carbsG: mealRows.reduce((sum, meal) => sum + meal.carbs_g, 0),
      fatG: mealRows.reduce((sum, meal) => sum + meal.fat_g, 0),
      waterMl: waterRows.reduce((sum, log) => sum + log.amount_ml, 0),
    };

    const { data: bonusRow, error: bonusError } = await this.supabase
      .from("nutrition_daily_bonuses")
      .select("*")
      .eq("player_id", playerId)
      .eq("bonus_date", dateKey)
      .maybeSingle<NutritionDailyBonusRow>();

    if (bonusError) {
      throw new InternalServerErrorException(
        `Ucitavanje dnevnog bonusa nije uspelo: ${bonusError.message}`,
      );
    }

    return {
      date: dateKey,
      totalCalories: totals.calories,
      totalProteinG: totals.proteinG,
      totalCarbsG: totals.carbsG,
      totalFatG: totals.fatG,
      totalWaterMl: totals.waterMl,
      targets,
      meals: mealRows.map(mapMealLogRowToResponse),
      waterLogs: waterRows.map(mapWaterLogRowToResponse),
      dailyGoalMet: nutrition.isNutritionDailyGoalMet(totals, targets),
      bonusXpGranted: bonusRow !== null,
    };
  }
}

function getUtcDayWindow(dateKey?: string): { dayStart: Date; dayEnd: Date; dateKey: string } {
  const base = dateKey ? new Date(`${dateKey}T00:00:00.000Z`) : new Date();
  const dayStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd, dateKey: dayStart.toISOString().slice(0, 10) };
}
