import { Controller, Get, UseGuards } from "@nestjs/common";
import type { ExerciseResponse } from "@risesolo/validation";
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
}
