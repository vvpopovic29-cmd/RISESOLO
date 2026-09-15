import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  generateTrainingPlanRequestSchema,
  type GenerateTrainingPlanRequest,
  type TrainingPlanDetailDto,
  type TrainingPlanSummaryDto,
} from "@risesolo/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TrainingPlansService } from "./training-plans.service";

@Controller("training-plans")
@UseGuards(JwtAuthGuard)
export class TrainingPlansController {
  constructor(private readonly trainingPlansService: TrainingPlansService) {}

  @Post("generate")
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(generateTrainingPlanRequestSchema)) dto: GenerateTrainingPlanRequest,
  ): Promise<TrainingPlanDetailDto> {
    return this.trainingPlansService.generate(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<TrainingPlanSummaryDto[]> {
    return this.trainingPlansService.list(user.id);
  }

  @Get(":id")
  getById(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<TrainingPlanDetailDto> {
    return this.trainingPlansService.getById(user.id, id);
  }
}
