import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AchievementsController } from "./achievements.controller";
import { AchievementsService } from "./achievements.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
