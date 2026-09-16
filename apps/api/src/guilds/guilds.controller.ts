import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  changeGuildMemberRoleRequestSchema,
  createGuildRequestSchema,
  donateToGuildRequestSchema,
  joinGuildRequestSchema,
  postGuildMessageRequestSchema,
  type ChangeGuildMemberRoleRequest,
  type CreateGuildRequest,
  type DonateToGuildRequest,
  type GuildDetailDto,
  type GuildMessageDto,
  type GuildSummaryDto,
  type JoinGuildRequest,
  type PostGuildMessageRequest,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { GuildsService } from "./guilds.service";

@Controller("guilds")
@UseGuards(JwtAuthGuard)
export class GuildsController {
  constructor(private readonly guildsService: GuildsService) {}

  @Get()
  list(): Promise<GuildSummaryDto[]> {
    return this.guildsService.listGuilds();
  }

  @Get("me")
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<GuildDetailDto> {
    return this.guildsService.getGuildDetail(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createGuildRequestSchema)) dto: CreateGuildRequest,
  ): Promise<GuildDetailDto> {
    return this.guildsService.createGuild(user.id, dto);
  }

  @Post("join")
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(joinGuildRequestSchema)) dto: JoinGuildRequest,
  ): Promise<GuildDetailDto> {
    return this.guildsService.joinGuild(user.id, dto);
  }

  @Post("leave")
  leave(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.guildsService.leaveGuild(user.id);
  }

  @Post("members/:userId/kick")
  kick(@CurrentUser() user: AuthenticatedUser, @Param("userId") targetUserId: string): Promise<void> {
    return this.guildsService.kickMember(user.id, targetUserId);
  }

  @Post("members/:userId/role")
  changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param("userId") targetUserId: string,
    @Body(new ZodValidationPipe(changeGuildMemberRoleRequestSchema)) dto: ChangeGuildMemberRoleRequest,
  ): Promise<void> {
    return this.guildsService.changeMemberRole(user.id, targetUserId, dto);
  }

  @Get("messages")
  getMessages(@CurrentUser() user: AuthenticatedUser): Promise<GuildMessageDto[]> {
    return this.guildsService.getMessages(user.id);
  }

  @Post("messages")
  postMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(postGuildMessageRequestSchema)) dto: PostGuildMessageRequest,
  ): Promise<GuildMessageDto> {
    return this.guildsService.postMessage(user.id, dto);
  }

  @Post("treasury/donate")
  donate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(donateToGuildRequestSchema)) dto: DonateToGuildRequest,
  ): Promise<GuildDetailDto> {
    return this.guildsService.donateToGuild(user.id, dto);
  }

  @Post("treasury/distribute")
  distribute(@CurrentUser() user: AuthenticatedUser): Promise<GuildDetailDto> {
    return this.guildsService.distributeGuildTreasury(user.id);
  }
}
