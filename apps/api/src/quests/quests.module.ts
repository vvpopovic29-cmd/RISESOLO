import { Module } from "@nestjs/common";
import { PlayerModule } from "../player/player.module";
import { PrismaQuestsRepository } from "./prisma-quests.repository";
import { QUESTS_REPOSITORY } from "./quests.repository";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";

@Module({
  imports: [PlayerModule],
  controllers: [QuestsController],
  providers: [QuestsService, { provide: QUESTS_REPOSITORY, useClass: PrismaQuestsRepository }],
})
export class QuestsModule {}
