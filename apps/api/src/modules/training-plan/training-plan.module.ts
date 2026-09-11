import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { TrainingPlanController } from "./training-plan.controller";
import { TrainingPlanService } from "./training-plan.service";

@Module({
  imports: [AuthModule],
  controllers: [TrainingPlanController],
  providers: [TrainingPlanService],
  exports: [TrainingPlanService],
})
export class TrainingPlanModule {}
