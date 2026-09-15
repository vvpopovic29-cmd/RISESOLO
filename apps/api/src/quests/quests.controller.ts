import { Controller, Get, UseGuards } from "@nestjs/common";
import type { DailyQuestDto } from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // Nema POST /quests/:id/complete - quest lifecycle je server-authoritative,
  // zavrsava se iskljucivo unutar workout completion engine-a.
  @Get("today")
  getToday(@CurrentUser() user: AuthenticatedUser): Promise<DailyQuestDto> {
    return this.questsService.getTodayQuest(user.id);
  }
}
