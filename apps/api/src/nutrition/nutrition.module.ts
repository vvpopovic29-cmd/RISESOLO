import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { QuestsModule } from "../quests/quests.module";
import { NutritionController } from "./nutrition.controller";
import { NutritionService } from "./nutrition.service";

@Module({
  imports: [AuthModule, AchievementsModule, QuestsModule, NotificationsModule],
  controllers: [NutritionController],
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
