import { Module } from "@nestjs/common";
import { PlayerModule } from "../player/player.module";
import { InMemoryQuestsRepository, QUESTS_REPOSITORY } from "./quests.repository";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";

@Module({
  imports: [PlayerModule],
  controllers: [QuestsController],
  providers: [QuestsService, { provide: QUESTS_REPOSITORY, useClass: InMemoryQuestsRepository }],
})
export class QuestsModule {}
