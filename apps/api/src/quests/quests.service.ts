import { Injectable } from "@nestjs/common";
import { COIN_REWARDS, XP_REWARDS } from "@risesolo/domain";
import type { DailyQuestDto } from "@risesolo/validation";
import type { Prisma, Quest } from "@prisma/client";
import { startOfUtcDay } from "../common/date";
import { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

const DAILY_QUEST_TITLE = "Zavrsi danasnji trening";
const DAILY_QUEST_DESCRIPTION = "Odradi bar jedan kompletan trening danas da osvojis dnevnu nagradu.";
const DAILY_QUEST_TARGET_SETS = 3;

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotentno: drugi poziv za isti (userId, date) vraca POSTOJECI quest
   * umesto da pravi duplikat - garantovano preko @@unique([userId, date, type])
   * u schema.prisma, ne samo "provere pa upisa" (race-safe).
   */
  async generateDailyQuest(userId: string, date: Date, db: Db = this.prisma): Promise<Quest> {
    const questDate = startOfUtcDay(date);

    const existing = await db.quest.findUnique({
      where: { userId_date_type: { userId, date: questDate, type: "DAILY" } },
    });
    if (existing) {
      return existing;
    }

    try {
      return await db.quest.create({
        data: {
          userId,
          date: questDate,
          type: "DAILY",
          title: DAILY_QUEST_TITLE,
          description: DAILY_QUEST_DESCRIPTION,
          targetSets: DAILY_QUEST_TARGET_SETS,
          targetReps: null,
          xpReward: XP_REWARDS.DAILY_QUEST_COMPLETE,
          coinReward: COIN_REWARDS.DAILY_QUEST_COMPLETE,
          status: "AVAILABLE",
        },
      });
    } catch (error) {
      // Race: neko drugi zahtev je kreirao isti quest izmedju findUnique i create (P2002 = unique violation).
      if (isUniqueConstraintError(error)) {
        const race = await db.quest.findUnique({
          where: { userId_date_type: { userId, date: questDate, type: "DAILY" } },
        });
        if (race) {
          return race;
        }
      }
      throw error;
    }
  }

  async getTodayQuest(userId: string): Promise<DailyQuestDto> {
    const quest = await this.generateDailyQuest(userId, new Date());
    return toDto(quest);
  }

  /**
   * Server-authoritative zavrsetak - poziva se SAMO iz workout completion
   * engine-a (nikad direktno na zahtev klijenta "completed: true"). Vraca
   * `null` ako je quest vec bio COMPLETED/EXPIRED (nema duplog zavrsetka).
   */
  async completeQuestIfPending(questId: string, db: Db = this.prisma): Promise<Quest | null> {
    const quest = await db.quest.findUnique({ where: { id: questId } });
    if (!quest || quest.status === "COMPLETED" || quest.status === "EXPIRED") {
      return null;
    }
    return db.quest.update({
      where: { id: questId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function toDto(quest: Quest): DailyQuestDto {
  return {
    id: quest.id,
    date: quest.date.toISOString().slice(0, 10),
    title: quest.title,
    description: quest.description,
    targetReps: quest.targetReps,
    targetSets: quest.targetSets,
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}
