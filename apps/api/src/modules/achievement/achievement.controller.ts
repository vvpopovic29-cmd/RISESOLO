import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { AchievementResponse } from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { AchievementService } from "./achievement.service";

@Controller("achievements")
@UseGuards(SupabaseAuthGuard)
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get()
  list(@CurrentPlayerId() playerId: string): Promise<AchievementResponse[]> {
    return this.achievementService.listAchievements(playerId);
  }

  @Post("evaluate")
  evaluate(@CurrentPlayerId() playerId: string): Promise<AchievementResponse[]> {
    return this.achievementService.evaluateAchievements(playerId);
  }
}
