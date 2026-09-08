import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import type { AllocateStatRequest, PlayerProfileResponse } from "@risesolo/validation";
import { allocateStatRequestSchema } from "@risesolo/validation";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PlayerService } from "./player.service";

@Controller("player")
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get("me")
  getMyProfile(@CurrentUser() user: AuthenticatedUser): Promise<PlayerProfileResponse> {
    return this.playerService.getProfile(user.userId);
  }

  @Patch("me/stats")
  allocateStat(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(allocateStatRequestSchema)) body: AllocateStatRequest,
  ): Promise<PlayerProfileResponse> {
    return this.playerService.allocateStat(user.userId, body.stat, body.points);
  }
}
