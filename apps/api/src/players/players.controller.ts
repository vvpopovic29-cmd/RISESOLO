import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  allocateStatPointsRequestSchema,
  onboardProfileRequestSchema,
  type AllocateStatPointsRequest,
  type OnboardProfileRequest,
  type PlayerStateDto,
} from "@risesolo/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlayersService } from "./players.service";

@Controller("players")
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<PlayerStateDto> {
    return this.playersService.getPlayerState(user.id);
  }

  @Post("me/onboarding")
  onboard(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(onboardProfileRequestSchema)) dto: OnboardProfileRequest,
  ): Promise<PlayerStateDto> {
    return this.playersService.onboardProfile(user.id, dto);
  }

  @Post("me/stats/allocate")
  allocateStats(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(allocateStatPointsRequestSchema)) dto: AllocateStatPointsRequest,
  ): Promise<PlayerStateDto> {
    return this.playersService.allocateStatPoints(user.id, dto);
  }
}
