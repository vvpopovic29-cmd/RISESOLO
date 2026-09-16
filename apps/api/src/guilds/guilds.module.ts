import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { GuildsController } from "./guilds.controller";
import { GuildsService } from "./guilds.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [GuildsController],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
