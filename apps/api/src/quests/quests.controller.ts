import { Controller, Get, UseGuards } from "@nestjs/common";
import type { DailyQuest } from "@risesolo/domain";
import { SupabaseAuthGuard, CurrentUserDecorator, type CurrentUser } from "../auth";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(SupabaseAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get("today")
  getToday(@CurrentUserDecorator() user: CurrentUser): Promise<DailyQuest> {
    return this.questsService.getOrCreateToday(user.id);
  }
}
