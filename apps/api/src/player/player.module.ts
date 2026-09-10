import { Module } from "@nestjs/common";
import { PlayerController } from "./player.controller";
import { InMemoryPlayerRepository, PLAYER_REPOSITORY } from "./player.repository";
import { PlayerService } from "./player.service";

@Module({
  controllers: [PlayerController],
  providers: [PlayerService, { provide: PLAYER_REPOSITORY, useClass: InMemoryPlayerRepository }],
  exports: [PlayerService],
})
export class PlayerModule {}
