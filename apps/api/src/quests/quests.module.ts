import { Module } from "@nestjs/common";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";
import { QuestsRepository } from "./quests.repository";

@Module({
  controllers: [QuestsController],
  providers: [QuestsService, QuestsRepository],
  exports: [QuestsService],
})
export class QuestsModule {}
