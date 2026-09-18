import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import {
  GUILD_ITEM_DEFINITIONS,
  HIDDEN_ITEM_DEFINITIONS,
  WORKSHOP_ITEMS,
  calculateLevel,
  canCraftWorkshopItem,
  evaluateNewlyDiscoveredGuildItems,
  evaluateNewlyDiscoveredHiddenItems,
  getWorkshopItem,
  type GuildItemId,
  type GuildItemStatsSnapshot,
  type HiddenItemId,
  type HiddenItemStatsSnapshot,
  type WorkshopItemDefinition,
} from "@risesolo/domain";
import type { CraftWorkshopItemResponse, InventoryItemDto, WorkshopItemDto } from "@risesolo/validation";
import type { Prisma } from "@prisma/client";
import { diffInUtcDays } from "../common/date";
import { PrismaService } from "../prisma/prisma.service";
import { getGuildItemDisplay } from "./guild-item-catalog";
import { getHiddenItemDisplay } from "./inventory-catalog";
import { getWorkshopItemDisplay } from "./workshop-catalog";

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

  /** GET /inventory/workshop - ceo katalog, unapred vidljiv (za razliku od Hidden Item-a). */
  async listWorkshop(userId: string): Promise<WorkshopItemDto[]> {
    const ownedRows = await this.prisma.inventoryItem.findMany({
      where: { userId, source: "WORKSHOP" },
      select: { itemId: true },
    });
    const ownedIds = new Set(ownedRows.map((row) => row.itemId));

    return WORKSHOP_ITEMS.map((item) => toWorkshopDto(item, ownedIds.has(item.id)));
  }

  /**
   * Izrada je atomska (jedna transakcija): provera nivoa/coins-a i upis
   * InventoryItem reda idu zajedno da ne bi doslo do trke (dupli klik
   * "Izradi" pre nego sto se prvi zahtev zavrsi) - isti princip kao
   * ShopService.purchase. `@@unique([userId, itemId])` je poslednja linija
   * odbrane ako i transakcija promasi.
   */
  async craftWorkshopItem(userId: string, itemId: string): Promise<CraftWorkshopItemResponse> {
    const itemDefinition = getWorkshopItem(itemId);
    if (!itemDefinition) {
      throw new NotFoundException("Predmet nije pronadjen");
    }

    try {
      const coins = await this.prisma.$transaction(async (tx) => {
        const [progression, existing] = await Promise.all([
          tx.progression.findUniqueOrThrow({ where: { userId } }),
          tx.inventoryItem.findUnique({ where: { userId_itemId: { userId, itemId } } }),
        ]);
        const level = calculateLevel(progression.totalXp);

        if (!canCraftWorkshopItem(level, progression.coins, itemDefinition, existing !== null)) {
          if (existing !== null) {
            throw new ForbiddenException("Vec imas ovaj predmet");
          }
          if (level < itemDefinition.levelRequirement) {
            throw new ForbiddenException(`Potreban je nivo ${itemDefinition.levelRequirement} za izradu ovog predmeta`);
          }
          throw new HttpException("Nemas dovoljno coins-a za izradu ovog predmeta", HttpStatus.PAYMENT_REQUIRED);
        }

        await tx.inventoryItem.create({ data: { userId, itemId, source: "WORKSHOP" } });
        const updated = await tx.progression.update({
          where: { userId },
          data: { coins: { decrement: itemDefinition.coinCost } },
        });
        return updated.coins;
      });

      return { item: toWorkshopDto(itemDefinition, true), coins };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenException("Vec imas ovaj predmet");
      }
      throw error;
    }
  }

  private async computeGuildSnapshot(userId: string, db: Db): Promise<GuildItemStatsSnapshot> {
    const membership = await db.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      return {
        isGuildLeader: false,
        currentGuildRaidsCompleted: 0,
        currentGuildTreasuryCoins: 0,
        guildMembershipDays: 0,
        currentGuildLevel: 0,
      };
    }

    const [guild, raidsCompleted] = await Promise.all([
      db.guild.findUniqueOrThrow({ where: { id: membership.guildId } }),
      db.guildRaid.count({ where: { guildId: membership.guildId, status: "COMPLETED" } }),
    ]);

    return {
      isGuildLeader: membership.role === "LEADER",
      currentGuildRaidsCompleted: raidsCompleted,
      currentGuildTreasuryCoins: guild.treasuryCoins,
      guildMembershipDays: diffInUtcDays(new Date(), membership.joinedAt),
      currentGuildLevel: calculateLevel(guild.totalXp),
    };
  }

  /** Vraca ID-jeve novo otkrivenih Guild Item-a (prazan niz ako nema novih). */
  async evaluateAndDiscoverGuild(userId: string, db: Db = this.prisma): Promise<GuildItemId[]> {
    const [snapshot, discoveredRows] = await Promise.all([
      this.computeGuildSnapshot(userId, db),
      db.inventoryItem.findMany({ where: { userId, source: "GUILD" }, select: { itemId: true } }),
    ]);

    const alreadyDiscovered = new Set(discoveredRows.map((row) => row.itemId as GuildItemId));
    const newlyDiscovered = evaluateNewlyDiscoveredGuildItems(snapshot, alreadyDiscovered);
    if (newlyDiscovered.length === 0) {
      return [];
    }

    await db.inventoryItem.createMany({
      data: newlyDiscovered.map((itemId) => ({ userId, itemId, source: "GUILD" as const })),
      skipDuplicates: true,
    });

    return newlyDiscovered;
  }

  /**
   * GET /inventory/guild - prvo "sustize" propustena otkrivanja (lazy, isti
   * princip kao Hidden Item), pa vraca ceo katalog. Za razliku od Hidden
   * Item-a, name/description se UVEK salju (Guild katalog je unapred
   * vidljiv, isti princip kao Achievements pragovi).
   */
  async listGuildItems(userId: string): Promise<InventoryItemDto[]> {
    await this.evaluateAndDiscoverGuild(userId);

    const discoveredRows = await this.prisma.inventoryItem.findMany({
      where: { userId, source: "GUILD" },
      select: { itemId: true, discoveredAt: true },
    });
    const discoveredByItemId = new Map(discoveredRows.map((row) => [row.itemId, row.discoveredAt]));

    return GUILD_ITEM_DEFINITIONS.map((definition) => {
      const discoveredAt = discoveredByItemId.get(definition.id) ?? null;
      const display = getGuildItemDisplay(definition.id);
      return {
        id: definition.id,
        source: "GUILD" as const,
        discovered: discoveredAt !== null,
        discoveredAt: discoveredAt !== null ? discoveredAt.toISOString() : null,
        name: display.name,
        description: display.description,
      };
    });
  }
}

function toWorkshopDto(definition: WorkshopItemDefinition, owned: boolean): WorkshopItemDto {
  const display = getWorkshopItemDisplay(definition.id);
  return {
    id: definition.id,
    levelRequirement: definition.levelRequirement,
    coinCost: definition.coinCost,
    owned,
    ...display,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}
