import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import {
  sendFriendRequestSchema,
  type FriendDto,
  type FriendRequestDto,
  type FriendsLeaderboardResponseDto,
  type FriendsOverviewResponse,
  type SendFriendRequestRequest,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { FriendsService } from "./friends.service";

@Controller("friends")
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  getOverview(@CurrentUser() user: AuthenticatedUser): Promise<FriendsOverviewResponse> {
    return this.friendsService.getOverview(user.id);
  }

  @Get("leaderboard")
  getLeaderboard(@CurrentUser() user: AuthenticatedUser): Promise<FriendsLeaderboardResponseDto> {
    return this.friendsService.getFriendsLeaderboard(user.id);
  }

  @Post("requests")
  sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(sendFriendRequestSchema)) dto: SendFriendRequestRequest,
  ): Promise<FriendRequestDto> {
    return this.friendsService.sendRequest(user.id, dto.username);
  }

  @Post("requests/:id/accept")
  acceptRequest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<FriendDto> {
    return this.friendsService.acceptRequest(user.id, id);
  }

  @Delete("requests/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRequest(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    return this.friendsService.removeRequest(user.id, id);
  }

  @Delete(":userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFriend(@CurrentUser() user: AuthenticatedUser, @Param("userId") userId: string): Promise<void> {
    return this.friendsService.removeFriend(user.id, userId);
  }
}
