import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import {
  logSetRequestSchema,
  startWorkoutSessionRequestSchema,
  type CompleteWorkoutResponse,
  type LogSetRequest,
  type StartWorkoutSessionRequest,
  type WorkoutSessionDto,
} from "@risesolo/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkoutsService } from "./workouts.service";

@Controller("workouts/sessions")
@UseGuards(JwtAuthGuard)
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(startWorkoutSessionRequestSchema)) dto: StartWorkoutSessionRequest,
  ): Promise<WorkoutSessionDto> {
    return this.workoutsService.startSession(user.id, dto);
  }

  @Post(":id/sets")
  @HttpCode(HttpStatus.NO_CONTENT)
  logSet(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") sessionId: string,
    @Body(new ZodValidationPipe(logSetRequestSchema)) dto: LogSetRequest,
  ): Promise<void> {
    return this.workoutsService.logSet(user.id, sessionId, dto);
  }

  @Post(":id/complete")
  complete(@CurrentUser() user: AuthenticatedUser, @Param("id") sessionId: string): Promise<CompleteWorkoutResponse> {
    return this.workoutsService.completeSession(user.id, sessionId);
  }
}
