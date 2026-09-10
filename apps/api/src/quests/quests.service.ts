import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { completeQuest } from "@risesolo/domain";
import type {
  CompleteQuestResponse,
  CreateQuestRequest,
  QuestResponse,
} from "@risesolo/validation";
import { toPlayerProfileResponse } from "../player/player.mapper";
import { PlayerService } from "../player/player.service";
import type { QuestRecord } from "./quest.entity";
import { toQuestResponse } from "./quest.mapper";
import { QUESTS_REPOSITORY, type QuestsRepository } from "./quests.repository";

@Injectable()
export class QuestsService {
  constructor(
    @Inject(QUESTS_REPOSITORY) private readonly questsRepository: QuestsRepository,
    private readonly playerService: PlayerService,
  ) {}

  async create(userId: string, request: CreateQuestRequest): Promise<QuestResponse> {
    const quest: QuestRecord = {
      id: randomUUID(),
      userId,
      title: request.title,
      description: request.description,
      xpReward: request.xpReward,
      goldReward: request.goldReward,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    await this.questsRepository.save(quest);
    return toQuestResponse(quest);
  }

  async listMine(userId: string): Promise<QuestResponse[]> {
    const quests = await this.questsRepository.findAllByUserId(userId);
    return quests.map(toQuestResponse);
  }

  async complete(userId: string, questId: string): Promise<CompleteQuestResponse> {
    const quest = await this.requireOwnedQuest(userId, questId);

    const transition = completeQuest(quest.status);
    if (!transition.ok) {
      throw new ConflictException("Quest je vec zavrsen");
    }

    const completedQuest: QuestRecord = {
      ...quest,
      status: transition.value,
      completedAt: new Date().toISOString(),
    };
    await this.questsRepository.save(completedQuest);

    const outcome = await this.playerService.applyRewards(userId, {
      xp: quest.xpReward,
      gold: quest.goldReward,
    });

    return {
      quest: toQuestResponse(completedQuest),
      player: toPlayerProfileResponse(userId, outcome.state),
      leveledUp: outcome.leveledUp,
      levelsGained: outcome.levelsGained,
      previousRank: outcome.previousRank,
      newRank: outcome.newRank,
    };
  }

  private async requireOwnedQuest(userId: string, questId: string): Promise<QuestRecord> {
    const quest = await this.questsRepository.findById(questId);
    if (!quest || quest.userId !== userId) {
      throw new NotFoundException("Quest nije pronadjen");
    }
    return quest;
  }
}
