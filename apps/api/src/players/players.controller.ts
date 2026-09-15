import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard, CurrentUserDecorator, type CurrentUser } from "../auth";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PlayersService } from "./players.service";
import type { PlayerSummary } from "./player-summary";
import { allocateStatPointsRequestSchema, type AllocateStatPointsRequest } from "./allocate-stat-points.dto";

@Controller("players")
@UseGuards(SupabaseAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get("me")
  getMe(@CurrentUserDecorator() user: CurrentUser): Promise<PlayerSummary> {
    return this.playersService.getSummary(user.id);
  }

  @Post("me/stat-points")
  async allocateStatPoints(
    @CurrentUserDecorator() user: CurrentUser,
    @Body(new ZodValidationPipe(allocateStatPointsRequestSchema)) body: AllocateStatPointsRequest,
  ) {
    const result = await this.playersService.allocateStatPoints(
      user.id,
      body.statKey,
      body.amount,
    );
    if (!result.ok) {
      throw new BadRequestException(result.error);
    }
    return result.value;
  }
}
