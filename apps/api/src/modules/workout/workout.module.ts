import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { ExerciseController } from "./exercise.controller";
import { WorkoutController } from "./workout.controller";
import { WorkoutService } from "./workout.service";

@Module({
  imports: [AuthModule],
  controllers: [ExerciseController, WorkoutController],
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}
