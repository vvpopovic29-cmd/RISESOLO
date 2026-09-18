import { ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  AI_ITEM_DEFINITIONS,
  EVENT_ITEMS,
  GUILD_ITEM_DEFINITIONS,
  HIDDEN_ITEM_DEFINITIONS,
  WORKSHOP_ITEMS,
  calculateLevel,
  calculateRank,
  canClaimEventItem,
  canCraftWorkshopItem,
  evaluateNewlyDiscoveredAiItems,
  evaluateNewlyDiscoveredGuildItems,
  evaluateNewlyDiscoveredHiddenItems,
  getEventItem,
  getWorkshopItem,
  isEventActive,
  type AiItemId,
  type EventItemDefinition,
  type GuildItemId,
  type GuildItemStatsSnapshot,
  type HiddenItemId,
  type HiddenItemStatsSnapshot,
  type WorkshopItemDefinition,
} from "@risesolo/domain";
import type { ClaimEventItemResponse, CraftWorkshopItemResponse, EventItemDto, InventoryItemDto, WorkshopItemDto } from "@risesolo/validation";
import type { Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { diffInUtcDays } from "../common/date";
import { PrismaService } from "../prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { getEventItemDisplay } from "./event-item-catalog";
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
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

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

  /** GET /inventory/event - ceo katalog, unapred vidljiv. `active` govori da li se moze prisvojiti SADA (godisnji kalendarski prozor). */
  async listEvent(userId: string): Promise<EventItemDto[]> {
    const ownedRows = await this.prisma.inventoryItem.findMany({
      where: { userId, source: "EVENT" },
      select: { itemId: true },
    });
    const ownedIds = new Set(ownedRows.map((row) => row.itemId));
    const now = new Date();

    return EVENT_ITEMS.map((item) => toEventDto(item, ownedIds.has(item.id), now));
  }

  /**
   * Prisvajanje je atomsko (jedna transakcija): provera aktivnog prozora i
   * upis InventoryItem reda idu zajedno da ne bi doslo do trke - isti
   * princip kao craftWorkshopItem, samo BEZ cene (Event Item je besplatan,
   * vremenski gate je jedini uslov). `@@unique([userId, itemId])` je
   * poslednja linija odbrane ako i transakcija promasi.
   */
  async claimEventItem(userId: string, itemId: string): Promise<ClaimEventItemResponse> {
    const itemDefinition = getEventItem(itemId);
    if (!itemDefinition) {
      throw new NotFoundException("Predmet nije pronadjen");
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.inventoryItem.findUnique({ where: { userId_itemId: { userId, itemId } } });
        const now = new Date();

        if (!canClaimEventItem(itemDefinition, now, existing !== null)) {
          if (existing !== null) {
            throw new ForbiddenException("Vec imas ovaj predmet");
          }
          throw new ForbiddenException("Ovaj dogadjaj trenutno nije aktivan");
        }

        await tx.inventoryItem.create({ data: { userId, itemId, source: "EVENT" } });
      });

      return { item: toEventDto(itemDefinition, true, new Date()) };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenException("Vec imas ovaj predmet");
      }
      throw error;
    }
  }

  /**
   * Pro/AI gate zivi OVDE, ne u @risesolo/domain (isti princip kao
   * QuestsService.getCurrentAiQuest) - besplatni korisnici i dani kada AI
   * servis nije dostupan NIKAD ne otkljucavaju AI predmete (graceful
   * degradation, prazan niz, nikad greska). Za razliku od
   * evaluateAndDiscover/evaluateAndDiscoverGuild, ovde se za SVAKI novo
   * dostignut prag zove Claude (generateItemFlavor) i generisan tekst se
   * ODMAH perzistira - ako AI poziv za jedan predmet ne uspe, ostali se i
   * dalje pokusavaju (jedan neuspeh ne blokira ostale).
   */
  async evaluateAndDiscoverAi(userId: string, db: Db = this.prisma): Promise<AiItemId[]> {
    if (!this.aiService.isConfigured) {
      return [];
    }
    const hasProAccess = await this.subscriptionsService.hasProAccess(userId);
    if (!hasProAccess) {
      return [];
    }

    const [progression, stats, discoveredRows] = await Promise.all([
      db.progression.findUniqueOrThrow({ where: { userId } }),
      db.playerStats.findUniqueOrThrow({ where: { userId } }),
      db.inventoryItem.findMany({ where: { userId, source: "AI_GENERATED" }, select: { itemId: true } }),
    ]);

    const level = calculateLevel(progression.totalXp);
    const alreadyDiscovered = new Set(discoveredRows.map((row) => row.itemId as AiItemId));
    const newlyDiscovered = evaluateNewlyDiscoveredAiItems({ level }, alreadyDiscovered);
    if (newlyDiscovered.length === 0) {
      return [];
    }

    const created: AiItemId[] = [];
    for (const itemId of newlyDiscovered) {
      const definition = AI_ITEM_DEFINITIONS.find((item) => item.id === itemId);
      if (!definition) continue;

      try {
        const flavor = await this.aiService.generateItemFlavor({
          level,
          rank: calculateRank(level),
          stats: {
            strength: stats.strength,
            agility: stats.agility,
            endurance: stats.endurance,
            vitality: stats.vitality,
            intelligence: stats.intelligence,
          },
          currentStreak: progression.currentStreak,
          levelRequirement: definition.levelRequirement,
        });
        await db.inventoryItem.create({
          data: { userId, itemId, source: "AI_GENERATED", generatedName: flavor.name, generatedDescription: flavor.description },
        });
        created.push(itemId);
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          this.logger.error(`Generisanje AI predmeta ${itemId} nije uspelo`, error instanceof Error ? error.stack : error);
        }
      }
    }

    return created;
  }

  /**
   * GET /inventory/ai - isti "tajan katalog" princip kao Hidden Item (isti
   * inventoryItemSchema, "???" dok se ne otkrije), ali name/description za
   * otkrivene predmete dolaze iz PERZISTIRANOG generatedName/
   * generatedDescription (AI tekst), ne iz staticne katalog funkcije.
   */
  async listAiItems(userId: string): Promise<InventoryItemDto[]> {
    await this.evaluateAndDiscoverAi(userId);

    const discoveredRows = await this.prisma.inventoryItem.findMany({
      where: { userId, source: "AI_GENERATED" },
      select: { itemId: true, discoveredAt: true, generatedName: true, generatedDescription: true },
    });
    const discoveredByItemId = new Map(discoveredRows.map((row) => [row.itemId, row]));

    return AI_ITEM_DEFINITIONS.map((definition) => {
      const row = discoveredByItemId.get(definition.id) ?? null;
      const discovered = row !== null;
      return {
        id: definition.id,
        source: "AI_GENERATED" as const,
        discovered,
        discoveredAt: row !== null ? row.discoveredAt.toISOString() : null,
        name: row?.generatedName ?? null,
        description: row?.generatedDescription ?? null,
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

function toEventDto(definition: EventItemDefinition, owned: boolean, now: Date): EventItemDto {
  const display = getEventItemDisplay(definition.id);
  return {
    id: definition.id,
    active: isEventActive(definition, now),
    owned,
    ...display,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}
