import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QuestsModule } from "../quests/quests.module";
import { PlayersController } from "./players.controller";
import { PlayersService } from "./players.service";

@Module({
  imports: [AuthModule, QuestsModule],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
