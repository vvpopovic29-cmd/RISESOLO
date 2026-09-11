import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import type {
  ExerciseProgressResponse,
  ExerciseResponse,
  StagnationSummaryResponse,
} from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { WorkoutService } from "./workout.service";

@Controller("exercises")
@UseGuards(SupabaseAuthGuard)
export class ExerciseController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Get()
  list(): Promise<ExerciseResponse[]> {
    return this.workoutService.listExercises();
  }

  @Get("stagnation-summary")
  getStagnationSummary(@CurrentPlayerId() playerId: string): Promise<StagnationSummaryResponse> {
    return this.workoutService.getStagnationSummary(playerId);
  }

  @Get(":id/progress")
  getProgress(
    @CurrentPlayerId() playerId: string,
    @Param("id") id: string,
  ): Promise<ExerciseProgressResponse> {
    return this.workoutService.getExerciseProgress(playerId, id);
  }
}
