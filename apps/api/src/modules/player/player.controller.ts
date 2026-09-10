import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import {
  allocateStatPointsInputSchema,
  updatePlayerProfileInputSchema,
  type AllocateStatPointsInput,
  type PlayerResponse,
  type UpdatePlayerProfileInput,
} from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { PlayerService } from "./player.service";

@Controller("players/me")
@UseGuards(SupabaseAuthGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get()
  getProfile(@CurrentPlayerId() playerId: string): Promise<PlayerResponse> {
    return this.playerService.getProfile(playerId);
  }

  @Patch()
  updateProfile(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(updatePlayerProfileInputSchema)) body: UpdatePlayerProfileInput,
  ): Promise<PlayerResponse> {
    return this.playerService.updateProfile(playerId, body);
  }

  @Post("stat-points/allocate")
  allocateStatPoints(
    @CurrentPlayerId() playerId: string,
    @Body(new ZodValidationPipe(allocateStatPointsInputSchema)) body: AllocateStatPointsInput,
  ): Promise<PlayerResponse> {
    return this.playerService.allocateStatPoints(playerId, body);
  }
}
