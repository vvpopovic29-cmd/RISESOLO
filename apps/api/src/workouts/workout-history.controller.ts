import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  workoutHistoryQuerySchema,
  type PersonalRecordDto,
  type WorkoutHistoryEntryDto,
  type WorkoutHistoryQuery,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { WorkoutHistoryService } from "./workout-history.service";

@Controller("workouts")
@UseGuards(JwtAuthGuard)
export class WorkoutHistoryController {
  constructor(private readonly workoutHistoryService: WorkoutHistoryService) {}

  @Get("history")
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(workoutHistoryQuerySchema)) query: WorkoutHistoryQuery,
  ): Promise<WorkoutHistoryEntryDto[]> {
    return this.workoutHistoryService.list(user.id, query.limit);
  }

  @Get("personal-records")
  listPersonalRecords(@CurrentUser() user: AuthenticatedUser): Promise<PersonalRecordDto[]> {
    return this.workoutHistoryService.listPersonalRecords(user.id);
  }
}
