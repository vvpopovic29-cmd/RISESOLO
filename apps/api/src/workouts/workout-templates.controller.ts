import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import {
  createWorkoutTemplateRequestSchema,
  type CreateWorkoutTemplateRequest,
  type WorkoutTemplateDetailDto,
  type WorkoutTemplateSummaryDto,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { WorkoutTemplatesService } from "./workout-templates.service";

@Controller("workouts/templates")
@UseGuards(JwtAuthGuard)
export class WorkoutTemplatesController {
  constructor(private readonly workoutTemplatesService: WorkoutTemplatesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createWorkoutTemplateRequestSchema)) dto: CreateWorkoutTemplateRequest,
  ): Promise<WorkoutTemplateDetailDto> {
    return this.workoutTemplatesService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<WorkoutTemplateSummaryDto[]> {
    return this.workoutTemplatesService.list(user.id);
  }

  @Get(":id")
  getById(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<WorkoutTemplateDetailDto> {
    return this.workoutTemplatesService.getById(user.id, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    return this.workoutTemplatesService.delete(user.id, id);
  }
}
