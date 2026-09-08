import { Module } from "@nestjs/common";
import { PlayerController } from "./player.controller";
import { PLAYER_REPOSITORY } from "./player.repository";
import { PlayerService } from "./player.service";
import { PrismaPlayerRepository } from "./prisma-player.repository";

@Module({
  controllers: [PlayerController],
  providers: [PlayerService, { provide: PLAYER_REPOSITORY, useClass: PrismaPlayerRepository }],
  exports: [PlayerService],
})
export class PlayerModule {}
