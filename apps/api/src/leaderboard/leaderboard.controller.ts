import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  leaderboardQuerySchema,
  type GuildLeaderboardResponseDto,
  type LeaderboardQuery,
  type PlayerLeaderboardResponseDto,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { LeaderboardService } from "./leaderboard.service";

@Controller("leaderboard")
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get("players")
  getPlayers(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(leaderboardQuerySchema)) query: LeaderboardQuery,
  ): Promise<PlayerLeaderboardResponseDto> {
    return this.leaderboardService.getPlayerLeaderboard(user.id, query.limit);
  }

  @Get("guilds")
  getGuilds(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(leaderboardQuerySchema)) query: LeaderboardQuery,
  ): Promise<GuildLeaderboardResponseDto> {
    return this.leaderboardService.getGuildLeaderboard(user.id, query.limit);
  }
}
