import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { questStatusSchema, z, type QuestResponse, type QuestStatus } from "@risesolo/validation";
import { CurrentPlayerId } from "../../auth/current-player-id.decorator";
import { SupabaseAuthGuard } from "../../auth/supabase-auth.guard";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { QuestService } from "./quest.service";

const listQuestsQuerySchema = z.object({ status: questStatusSchema.optional() });
type ListQuestsQuery = z.infer<typeof listQuestsQuerySchema>;

@Controller("quests")
@UseGuards(SupabaseAuthGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  @Get()
  list(
    @CurrentPlayerId() playerId: string,
    @Query(new ZodValidationPipe(listQuestsQuerySchema)) query: ListQuestsQuery,
  ): Promise<QuestResponse[]> {
    return this.questService.listQuests(playerId, query.status as QuestStatus | undefined);
  }

  @Post("daily/generate")
  generateDaily(@CurrentPlayerId() playerId: string): Promise<QuestResponse> {
    return this.questService.generateDailyQuest(playerId);
  }

  @Post(":id/complete")
  complete(@CurrentPlayerId() playerId: string, @Param("id") id: string): Promise<QuestResponse> {
    return this.questService.completeQuest(playerId, id);
  }
}
