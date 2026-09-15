import { Injectable } from "@nestjs/common";
import { BOSS_QUEST_TARGET_SESSIONS, COIN_REWARDS, XP_REWARDS } from "@risesolo/domain";
import type { BossQuestDto, DailyQuestDto } from "@risesolo/validation";
import type { Prisma, Quest, QuestType } from "@prisma/client";
import { startOfIsoWeek, startOfUtcDay } from "../common/date";
import { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

const DAILY_QUEST_TITLE = "Zavrsi danasnji trening";
const DAILY_QUEST_DESCRIPTION = "Odradi bar jedan kompletan trening danas da osvojis dnevnu nagradu.";
const DAILY_QUEST_TARGET_SETS = 3;

const BOSS_QUEST_TITLE = "Nedeljni Boss Quest";
const BOSS_QUEST_DESCRIPTION = `Zavrsi ${BOSS_QUEST_TARGET_SESSIONS} treninga ove nedelje da pobedis Boss-a i osvojis veliku nagradu.`;

interface QuestFields {
  title: string;
  description: string;
  targetSets: number;
  xpReward: number;
  coinReward: number;
}

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotentno: drugi poziv za isti (userId, date) vraca POSTOJECI quest
   * umesto da pravi duplikat - garantovano preko @@unique([userId, date, type])
   * u schema.prisma, ne samo "provere pa upisa" (race-safe).
   */
  async generateDailyQuest(userId: string, date: Date, db: Db = this.prisma): Promise<Quest> {
    return this.generateQuest(
      userId,
      "DAILY",
      startOfUtcDay(date),
      {
        title: DAILY_QUEST_TITLE,
        description: DAILY_QUEST_DESCRIPTION,
        targetSets: DAILY_QUEST_TARGET_SETS,
        xpReward: XP_REWARDS.DAILY_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.DAILY_QUEST_COMPLETE,
      },
      db,
    );
  }

  /** Isti idempotency princip kao dnevni quest, ali po ISO nedelji (date = ponedeljak te nedelje). */
  async generateBossQuest(userId: string, date: Date, db: Db = this.prisma): Promise<Quest> {
    return this.generateQuest(
      userId,
      "BOSS",
      startOfIsoWeek(date),
      {
        title: BOSS_QUEST_TITLE,
        description: BOSS_QUEST_DESCRIPTION,
        targetSets: BOSS_QUEST_TARGET_SESSIONS,
        xpReward: XP_REWARDS.BOSS_QUEST_COMPLETE,
        coinReward: COIN_REWARDS.BOSS_QUEST_COMPLETE,
      },
      db,
    );
  }

  /**
   * Boss quest progres se NAMERNO ne cuva na questu - racuna se prebrojavanjem
   * zavrsenih WorkoutSession u toj ISO nedelji (isti princip kao total_xp:
   * izvedeno, ne cuvano, da ne bi doslo do drift-a).
   */
  async countCompletedSessionsThisWeek(userId: string, date: Date, db: Db = this.prisma): Promise<number> {
    const weekStart = startOfIsoWeek(date);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    return db.workoutSession.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: weekStart, lt: weekEnd } },
    });
  }

  async getTodayQuest(userId: string): Promise<DailyQuestDto> {
    const quest = await this.generateDailyQuest(userId, new Date());
    return toDailyDto(quest);
  }

  async getCurrentBossQuest(userId: string): Promise<BossQuestDto> {
    const now = new Date();
    const [quest, progress] = await Promise.all([
      this.generateBossQuest(userId, now),
      this.countCompletedSessionsThisWeek(userId, now),
    ]);
    return toBossDto(quest, progress);
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

  private async generateQuest(userId: string, type: QuestType, date: Date, fields: QuestFields, db: Db): Promise<Quest> {
    const existing = await db.quest.findUnique({
      where: { userId_date_type: { userId, date, type } },
    });
    if (existing) {
      return existing;
    }

    try {
      return await db.quest.create({
        data: { userId, date, type, targetReps: null, status: "AVAILABLE", ...fields },
      });
    } catch (error) {
      // Race: neko drugi zahtev je kreirao isti quest izmedju findUnique i create (P2002 = unique violation).
      if (isUniqueConstraintError(error)) {
        const race = await db.quest.findUnique({
          where: { userId_date_type: { userId, date, type } },
        });
        if (race) {
          return race;
        }
      }
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function toDailyDto(quest: Quest): DailyQuestDto {
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

function toBossDto(quest: Quest, progress: number): BossQuestDto {
  const targetSessions = quest.targetSets ?? BOSS_QUEST_TARGET_SESSIONS;
  return {
    id: quest.id,
    weekStart: quest.date.toISOString().slice(0, 10),
    title: quest.title,
    description: quest.description,
    targetSessions,
    progress: Math.min(progress, targetSessions),
    xpReward: quest.xpReward,
    coinReward: quest.coinReward,
    status: quest.status,
  };
}
