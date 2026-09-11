import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import {
  updateTrainingPlanInputSchema,
  type TrainingPlanResponse,
  type UpdateTrainingPlanInput,
} from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { TrainingPlanService } from "./training-plan.service";

@Controller("training-plan")
@UseGuards(SupabaseAuthGuard)
export class TrainingPlanController {
  constructor(private readonly trainingPlanService: TrainingPlanService) {}

  @Get()
  get(@CurrentPlayerId() playerId: string): Promise<TrainingPlanResponse> {
    return this.trainingPlanService.getPlan(playerId);
  }

  @Put()
  update(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(updateTrainingPlanInputSchema)) body: UpdateTrainingPlanInput,
  ): Promise<TrainingPlanResponse> {
    return this.trainingPlanService.updatePlan(playerId, body);
  }
}
