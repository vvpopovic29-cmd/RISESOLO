import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { QuestsController } from "./quests.controller";
import { QuestsService } from "./quests.service";

@Module({
  imports: [AuthModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
