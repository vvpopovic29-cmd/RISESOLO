import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import {
  createNutritionEntryRequestSchema,
  getNutritionDayQuerySchema,
  type CreateNutritionEntryRequest,
  type DailyNutritionSummaryDto,
  type GetNutritionDayQuery,
  type NutritionEntryDto,
} from "@risesolo/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NutritionService } from "./nutrition.service";

@Controller("nutrition")
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post("entries")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createNutritionEntryRequestSchema)) dto: CreateNutritionEntryRequest,
  ): Promise<NutritionEntryDto> {
    return this.nutritionService.createEntry(user.id, dto);
  }

  @Get("entries")
  getDay(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(getNutritionDayQuerySchema)) query: GetNutritionDayQuery,
  ): Promise<DailyNutritionSummaryDto> {
    return this.nutritionService.getDaySummary(user.id, query.date);
  }

  @Delete("entries/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    return this.nutritionService.deleteEntry(user.id, id);
  }
}
