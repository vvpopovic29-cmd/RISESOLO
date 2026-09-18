import { Injectable } from "@nestjs/common";
import {
  HIDDEN_ITEM_DEFINITIONS,
  evaluateNewlyDiscoveredHiddenItems,
  type HiddenItemId,
  type HiddenItemStatsSnapshot,
} from "@risesolo/domain";
import type { InventoryItemDto } from "@risesolo/validation";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { getHiddenItemDisplay } from "./inventory-catalog";

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Inventory (B2) - Hidden Items su prvi izvor. Vidi @risesolo/domain
 * hidden-item.ts za katalog/uslove. Isti "derive, don't cache" + lazy
 * catch-up princip kao AchievementsService: `evaluateAndDiscover` racuna svez
 * snapshot iz postojecih tabela (nema posebnih "counter" kolona) i
 * perzistira samo novo otkrivene, `listForUser` prvo sustize propustena
 * otkrivanja pa vraca ceo katalog.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private async computeHiddenSnapshot(userId: string, db: Db): Promise<HiddenItemStatsSnapshot> {
    const [progression, stats, completedSessions, repsBySession, penaltyQuestsEverApplied] = await Promise.all([
      db.progression.findUniqueOrThrow({ where: { userId } }),
      db.playerStats.findUniqueOrThrow({ where: { userId } }),
      db.workoutSession.findMany({
        where: { userId, status: "COMPLETED", completedAt: { not: null } },
        select: { completedAt: true },
      }),
      db.workoutSet.groupBy({
        by: ["sessionId"],
        where: { completed: true, session: { userId, status: "COMPLETED" } },
        _sum: { reps: true },
      }),
      db.quest.count({ where: { userId, type: "PENALTY" } }),
    ]);

    const hasMidnightWorkout = completedSessions.some(
      (session) => session.completedAt !== null && session.completedAt.getUTCHours() < 4,
    );
    const maxSingleSessionReps = repsBySession.reduce((max, row) => Math.max(max, row._sum.reps ?? 0), 0);
    const statValues = [stats.strength, stats.agility, stats.endurance, stats.vitality, stats.intelligence];

    return {
      hasMidnightWorkout,
      maxSingleSessionReps,
      minStatValue: Math.min(...statValues),
      maxStatValue: Math.max(...statValues),
      coins: progression.coins,
      currentStreak: progression.currentStreak,
      penaltyQuestsEverApplied,
    };
  }

  /** Vraca ID-jeve novo otkrivenih Hidden Item-a (prazan niz ako nema novih). */
  async evaluateAndDiscover(userId: string, db: Db = this.prisma): Promise<HiddenItemId[]> {
    const [snapshot, discoveredRows] = await Promise.all([
      this.computeHiddenSnapshot(userId, db),
      db.inventoryItem.findMany({ where: { userId, source: "HIDDEN" }, select: { itemId: true } }),
    ]);

    const alreadyDiscovered = new Set(discoveredRows.map((row) => row.itemId as HiddenItemId));
    const newlyDiscovered = evaluateNewlyDiscoveredHiddenItems(snapshot, alreadyDiscovered);
    if (newlyDiscovered.length === 0) {
      return [];
    }

    await db.inventoryItem.createMany({
      data: newlyDiscovered.map((itemId) => ({ userId, itemId, source: "HIDDEN" as const })),
      skipDuplicates: true,
    });

    return newlyDiscovered;
  }

  /**
   * GET /inventory - prvo "sustize" propustena otkrivanja (lazy, isti princip
   * kao AchievementsService.listForUser), pa vraca ceo katalog. Neotkriveni
   * predmet nikad ne nosi name/description (ostaje "???" u UI).
   */
  async listForUser(userId: string): Promise<InventoryItemDto[]> {
    await this.evaluateAndDiscover(userId);

    const discoveredRows = await this.prisma.inventoryItem.findMany({
      where: { userId, source: "HIDDEN" },
      select: { itemId: true, discoveredAt: true },
    });
    const discoveredByItemId = new Map(discoveredRows.map((row) => [row.itemId, row.discoveredAt]));

    return HIDDEN_ITEM_DEFINITIONS.map((definition) => {
      const discoveredAt = discoveredByItemId.get(definition.id) ?? null;
      const discovered = discoveredAt !== null;
      const display = discovered ? getHiddenItemDisplay(definition.id) : null;
      return {
        id: definition.id,
        source: "HIDDEN" as const,
        discovered,
        discoveredAt: discoveredAt !== null ? discoveredAt.toISOString() : null,
        name: display?.name ?? null,
        description: display?.description ?? null,
      };
    });
  }
}
