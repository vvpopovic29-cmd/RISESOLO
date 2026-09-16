import { Module } from "@nestjs/common";
import { AchievementsModule } from "../achievements/achievements.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { GuildsController } from "./guilds.controller";
import { GuildsService } from "./guilds.service";

@Module({
  imports: [AuthModule, NotificationsModule, AchievementsModule],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
