import { Injectable } from "@nestjs/common";
import type { QuestRecord } from "./quest.entity";

export const QUESTS_REPOSITORY = Symbol("QUESTS_REPOSITORY");

export interface QuestsRepository {
  findById(id: string): Promise<QuestRecord | undefined>;
  findAllByUserId(userId: string): Promise<QuestRecord[]>;
  save(quest: QuestRecord): Promise<void>;
}

/**
 * In-memory implementacija (Faza 2 jos nema Prisma/PostgreSQL konekciju -
 * videti "Poznata ogranicenja" u root README-u).
 */
@Injectable()
export class InMemoryQuestsRepository implements QuestsRepository {
  private readonly questsById = new Map<string, QuestRecord>();

  async findById(id: string): Promise<QuestRecord | undefined> {
    return this.questsById.get(id);
  }

  async findAllByUserId(userId: string): Promise<QuestRecord[]> {
    return [...this.questsById.values()].filter((quest) => quest.userId === userId);
  }

  async save(quest: QuestRecord): Promise<void> {
    this.questsById.set(quest.id, quest);
  }
}
