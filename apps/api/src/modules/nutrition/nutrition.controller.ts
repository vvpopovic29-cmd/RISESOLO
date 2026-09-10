import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  logMealInputSchema,
  logWaterInputSchema,
  updateNutritionTargetsInputSchema,
  z,
  type LogMealInput,
  type LogWaterInput,
  type MealLogResponse,
  type NutritionDailySummary,
  type NutritionTargets,
  type UpdateNutritionTargetsInput,
  type WaterLogResponse,
} from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { NutritionService } from "./nutrition.service";

const dailySummaryQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date mora biti u YYYY-MM-DD obliku")
    .optional(),
});
type DailySummaryQuery = z.infer<typeof dailySummaryQuerySchema>;

@Controller("nutrition")
@UseGuards(SupabaseAuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get("targets")
  getTargets(@CurrentPlayerId() playerId: string): Promise<NutritionTargets> {
    return this.nutritionService.getTargets(playerId);
  }

  @Patch("targets")
  updateTargets(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(updateNutritionTargetsInputSchema))
    body: UpdateNutritionTargetsInput,
  ): Promise<NutritionTargets> {
    return this.nutritionService.updateTargets(playerId, body);
  }

  @Post("meals")
  logMeal(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(logMealInputSchema)) body: LogMealInput,
  ): Promise<MealLogResponse> {
    return this.nutritionService.logMeal(playerId, body);
  }

  @Post("water")
  logWater(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(logWaterInputSchema)) body: LogWaterInput,
  ): Promise<WaterLogResponse> {
    return this.nutritionService.logWater(playerId, body);
  }

  @Get("summary")
  getSummary(
    @CurrentPlayerId() playerId: string,
    @Query(new ZodValidationPipe(dailySummaryQuerySchema)) query: DailySummaryQuery,
  ): Promise<NutritionDailySummary> {
    return this.nutritionService.getDailySummary(playerId, query.date);
  }
}
