import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import type { CompletionOutcome, WorkoutSession } from "@risesolo/domain";
import { SupabaseAuthGuard, CurrentUserDecorator, type CurrentUser } from "../auth";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WorkoutsService } from "./workouts.service";
import { startWorkoutRequestSchema, type StartWorkoutRequest } from "./start-workout.dto";
import { logSetRequestSchema, type LogSetRequest } from "./log-set.dto";

@Controller("workouts")
@UseGuards(SupabaseAuthGuard)
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  start(
    @CurrentUserDecorator() user: CurrentUser,
    @Body(new ZodValidationPipe(startWorkoutRequestSchema)) body: StartWorkoutRequest,
  ): Promise<WorkoutSession> {
    return this.workoutsService.startSession(user.id, body);
  }

  @Post(":id/sets")
  logSet(
    @CurrentUserDecorator() user: CurrentUser,
    @Param("id") sessionId: string,
    @Body(new ZodValidationPipe(logSetRequestSchema)) body: LogSetRequest,
  ): Promise<WorkoutSession> {
    return this.workoutsService.logSet(user.id, sessionId, body);
  }

  @Post(":id/complete")
  complete(
    @CurrentUserDecorator() user: CurrentUser,
    @Param("id") sessionId: string,
  ): Promise<CompletionOutcome> {
    return this.workoutsService.completeWorkoutSession(user.id, sessionId);
  }
}
