import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AchievementDto } from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AchievementsService } from "./achievements.service";

@Controller("achievements")
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<AchievementDto[]> {
    return this.achievementsService.listForUser(user.id);
  }
}
