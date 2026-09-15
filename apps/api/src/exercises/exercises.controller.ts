import { Controller, Get, Query } from "@nestjs/common";
import type { Exercise } from "@risesolo/domain";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ExercisesService } from "./exercises.service";
import { listExercisesQuerySchema, type ListExercisesQueryDto } from "./list-exercises.dto";

/** Javan, bez auth guard-a - exercises su referentni sadrzaj (RLS dozvoljava SELECT svima). */
@Controller("exercises")
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listExercisesQuerySchema)) query: ListExercisesQueryDto,
  ): Promise<Exercise[]> {
    return this.exercisesService.list(query);
  }
}
