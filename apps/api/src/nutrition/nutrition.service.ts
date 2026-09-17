import { Injectable, NotFoundException } from "@nestjs/common";
import { sumDailyMacros } from "@risesolo/domain";
import type { CreateNutritionEntryRequest, DailyNutritionSummaryDto, NutritionEntryDto } from "@risesolo/validation";
import type { NutritionEntry } from "@prisma/client";
import { AchievementsService } from "../achievements/achievements.service";
import { startOfUtcDay } from "../common/date";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { QuestsService } from "../quests/quests.service";

@Injectable()
export class NutritionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementsService: AchievementsService,
    private readonly questsService: QuestsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Ulogovan obrok moze da zavrsi danasnji dnevni quest AKO je taj dan
   * izabran LOG_NUTRITION kind (vidi @risesolo/domain daily-quest-pool) -
   * uvek se koristi STVARNI danasnji datum servera za quest, ne `dto.date`
   * (unos moze biti za drugi dan, ali dnevni quest je uvek vezan za danas -
   * isti princip kao WorkoutsService.completeSession).
   */
  async createEntry(userId: string, dto: CreateNutritionEntryRequest): Promise<NutritionEntryDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.nutritionEntry.create({
        data: {
          userId,
          date: new Date(dto.date),
          mealType: dto.mealType,
          name: dto.name,
          calories: dto.calories,
          proteinG: dto.proteinG,
          carbsG: dto.carbsG,
          fatG: dto.fatG,
        },
      });

      const quest = await this.questsService.generateDailyQuest(userId, new Date(), tx);
      const questReward =
        quest.kind === "LOG_NUTRITION" ? await this.questsService.completeDailyQuestRewardIfPending(userId, quest.id, tx) : null;

      return { entry, questReward };
    });

    this.achievementsService
      .evaluateAndUnlock(userId)
      .then((newlyUnlocked) => this.achievementsService.notifyNewlyUnlocked(userId, newlyUnlocked))
      .catch(() => undefined);

    // Push notifikacija ide POSLE zavrsene transakcije (isti princip kao
    // WorkoutsService.completeSession - nikad unutar transakcije).
    if (result.questReward?.completed) {
      this.notificationsService
        .sendToUser(userId, {
          title: "Dnevni quest zavrsen!",
          body: "Ulogovao/la si obrok i osvojio/la dnevnu nagradu.",
          data: { screen: "/home" },
        })
        .catch(() => undefined);
    }

    return toDto(result.entry);
  }

  /** Bez `dateParam` - danasnji dan (UTC). */
  async getDaySummary(userId: string, dateParam?: string): Promise<DailyNutritionSummaryDto> {
    const date = dateParam ? new Date(dateParam) : startOfUtcDay(new Date());

    const entries = await this.prisma.nutritionEntry.findMany({
      where: { userId, date },
      orderBy: { createdAt: "asc" },
    });
    const dtos = entries.map(toDto);

    return {
      date: date.toISOString().slice(0, 10),
      entries: dtos,
      totals: sumDailyMacros(dtos),
    };
  }

  async deleteEntry(userId: string, id: string): Promise<void> {
    const entry = await this.prisma.nutritionEntry.findUnique({ where: { id } });
    // Ownership provera ovde (ekvivalent RLS-a) - 404 i za nepostojeci i za tudji unos, ne curi informaciju.
    if (!entry || entry.userId !== userId) {
      throw new NotFoundException("Unos ishrane nije pronadjen");
    }
    await this.prisma.nutritionEntry.delete({ where: { id } });
  }
}

function toDto(entry: NutritionEntry): NutritionEntryDto {
  return {
    id: entry.id,
    date: entry.date.toISOString().slice(0, 10),
    mealType: entry.mealType,
    name: entry.name,
    calories: entry.calories,
    proteinG: entry.proteinG,
    carbsG: entry.carbsG,
    fatG: entry.fatG,
  };
}
