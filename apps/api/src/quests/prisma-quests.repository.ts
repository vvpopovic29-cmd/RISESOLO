import { Injectable } from "@nestjs/common";
import type { Quest as PrismaQuest } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { QuestRecord } from "./quest.entity";
import type { QuestsRepository } from "./quests.repository";

function toRecord(row: PrismaQuest): QuestRecord {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description ?? undefined,
    xpReward: row.xpReward,
    goldReward: row.goldReward,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : undefined,
  };
}

@Injectable()
export class PrismaQuestsRepository implements QuestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<QuestRecord | undefined> {
    const row = await this.prisma.quest.findUnique({ where: { id } });
    return row ? toRecord(row) : undefined;
  }

  async findAllByUserId(userId: string): Promise<QuestRecord[]> {
    const rows = await this.prisma.quest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRecord);
  }

  async save(quest: QuestRecord): Promise<void> {
    await this.prisma.quest.upsert({
      where: { id: quest.id },
      create: {
        id: quest.id,
        userId: quest.userId,
        title: quest.title,
        description: quest.description,
        xpReward: quest.xpReward,
        goldReward: quest.goldReward,
        status: quest.status,
        createdAt: new Date(quest.createdAt),
        completedAt: quest.completedAt ? new Date(quest.completedAt) : null,
      },
      update: {
        title: quest.title,
        description: quest.description,
        xpReward: quest.xpReward,
        goldReward: quest.goldReward,
        status: quest.status,
        completedAt: quest.completedAt ? new Date(quest.completedAt) : null,
      },
    });
  }
}
