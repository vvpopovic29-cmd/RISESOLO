import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import {
  logSetRequestSchema,
  startWorkoutSessionRequestSchema,
  type ActiveWorkoutSessionResponse,
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

  @Get("active")
  getActive(@CurrentUser() user: AuthenticatedUser): Promise<ActiveWorkoutSessionResponse> {
    return this.workoutsService.getActiveSession(user.id);
  }

  @Post(":id/abandon")
  @HttpCode(HttpStatus.NO_CONTENT)
  abandon(@CurrentUser() user: AuthenticatedUser, @Param("id") sessionId: string): Promise<void> {
    return this.workoutsService.abandonSession(user.id, sessionId);
  }
}
