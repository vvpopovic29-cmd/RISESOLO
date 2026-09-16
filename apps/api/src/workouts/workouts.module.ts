import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GuildsModule } from "../guilds/guilds.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { QuestsModule } from "../quests/quests.module";
import { WorkoutsController } from "./workouts.controller";
import { WorkoutsService } from "./workouts.service";

@Module({
  imports: [AuthModule, QuestsModule, GuildsModule, NotificationsModule],
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
