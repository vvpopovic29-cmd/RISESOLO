import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { listExercisesQuerySchema, type ExerciseDto, type ListExercisesQuery } from "@risesolo/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ExercisesService } from "./exercises.service";

@Controller("exercises")
@UseGuards(JwtAuthGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(listExercisesQuerySchema)) query: ListExercisesQuery): Promise<ExerciseDto[]> {
    return this.exercisesService.list(query);
  }

  @Get(":slug")
  getBySlug(@Param("slug") slug: string): Promise<ExerciseDto> {
    return this.exercisesService.getBySlug(slug);
  }
}
