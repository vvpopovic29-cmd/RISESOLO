import { Injectable, NotFoundException } from "@nestjs/common";
import { sumDailyMacros } from "@risesolo/domain";
import type { CreateNutritionEntryRequest, DailyNutritionSummaryDto, NutritionEntryDto } from "@risesolo/validation";
import type { NutritionEntry } from "@prisma/client";
import { AchievementsService } from "../achievements/achievements.service";
import { startOfUtcDay } from "../common/date";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NutritionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async createEntry(userId: string, dto: CreateNutritionEntryRequest): Promise<NutritionEntryDto> {
    const entry = await this.prisma.nutritionEntry.create({
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

    this.achievementsService
      .evaluateAndUnlock(userId)
      .then((newlyUnlocked) => this.achievementsService.notifyNewlyUnlocked(userId, newlyUnlocked))
      .catch(() => undefined);

    return toDto(entry);
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
