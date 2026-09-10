import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type {
  CompleteQuestResponse,
  CreateQuestRequest,
  QuestResponse,
} from "@risesolo/validation";
import { createQuestRequestSchema } from "@risesolo/validation";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../common/current-user.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createQuestRequestSchema)) body: CreateQuestRequest,
  ): Promise<QuestResponse> {
    return this.questsService.create(user.userId, body);
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<QuestResponse[]> {
    return this.questsService.listMine(user.userId);
  }

  @Patch(":id/complete")
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<CompleteQuestResponse> {
    return this.questsService.complete(user.userId, id);
  }
}
