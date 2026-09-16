import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { AuthModule } from "../auth/auth.module";
import { ExercisesModule } from "../exercises/exercises.module";
import { AiModule } from "../ai/ai.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { TrainingPlansController } from "./training-plans.controller";
import { TrainingPlansService } from "./training-plans.service";

@Module({
  imports: [AuthModule, ExercisesModule, AiModule, SubscriptionsModule, AchievementsModule],
  controllers: [TrainingPlansController],
  providers: [TrainingPlansService],
  exports: [TrainingPlansService],
})
export class TrainingPlansModule {}
