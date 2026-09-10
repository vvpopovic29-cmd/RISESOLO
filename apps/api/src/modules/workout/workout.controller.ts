import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  logWorkoutInputSchema,
  type LogWorkoutInput,
  type LogWorkoutResponse,
  type WorkoutResponse,
} from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { WorkoutService } from "./workout.service";

@Controller("workouts")
@UseGuards(SupabaseAuthGuard)
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  logWorkout(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(logWorkoutInputSchema)) body: LogWorkoutInput,
  ): Promise<LogWorkoutResponse> {
    return this.workoutService.logWorkout(playerId, body);
  }

  @Get()
  list(@CurrentPlayerId() playerId: string): Promise<WorkoutResponse[]> {
    return this.workoutService.listWorkouts(playerId);
  }

  @Get(":id")
  getOne(@CurrentPlayerId() playerId: string, @Param("id") id: string): Promise<WorkoutResponse> {
    return this.workoutService.getWorkout(playerId, id);
  }
}
