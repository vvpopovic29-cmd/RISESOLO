import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { AuthModule } from "../auth/auth.module";
import { GuildsModule } from "../guilds/guilds.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { QuestsModule } from "../quests/quests.module";
import { WorkoutsController } from "./workouts.controller";
import { WorkoutsService } from "./workouts.service";

@Module({
  imports: [AuthModule, QuestsModule, GuildsModule, NotificationsModule, AchievementsModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
