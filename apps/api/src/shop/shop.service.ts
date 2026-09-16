import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { SHOP_ITEMS, canPurchaseShopItem, getShopItem, type ShopCategory, type ShopItemId } from "@risesolo/domain";
import type { PurchaseShopItemResponse, ShopItemDto } from "@risesolo/validation";
import { PrismaService } from "../prisma/prisma.service";
import { getShopItemDisplay } from "./shop-catalog";

/**
 * Coin Shop - kupovina kozmetike za coins (jedini dosadasnji "sink" za
 * coins je bio guild riznica, vidi GuildsService). Katalog (cene/kategorije)
 * zivi u @risesolo/domain, prikazni tekst u ovom modulu (shop-catalog.ts).
 */
@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<ShopItemDto[]> {
    const [ownedRows, profile] = await Promise.all([
      this.prisma.userCosmetic.findMany({ where: { userId }, select: { itemId: true } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);
    if (!profile) {
      throw new NotFoundException("Profil igraca nije pronadjen");
    }

    const ownedIds = new Set(ownedRows.map((row) => row.itemId));
    const equippedIds = new Set(
      [profile.equippedAvatarFrameId, profile.equippedTitleId].filter((id): id is string => id !== null),
    );

    return SHOP_ITEMS.map((item) => toDto(item.id, item.category, item.price, ownedIds.has(item.id), equippedIds.has(item.id)));
  }

  /**
   * Kupovina je atomska (jedna transakcija): provera coins-a i upis
   * `UserCosmetic` reda idu zajedno da ne bi doslo do trke (dupli klik
   * "Kupi" pre nego sto se prvi zahtev zavrsi) - `@@unique([userId, itemId])`
   * je poslednja linija odbrane ako i transakcija promasi.
   */
  async purchase(userId: string, itemId: string): Promise<PurchaseShopItemResponse> {
    const itemDefinition = getShopItem(itemId);
    if (!itemDefinition) {
      throw new NotFoundException("Predmet nije pronadjen");
    }

    try {
      const coins = await this.prisma.$transaction(async (tx) => {
        const [progression, existingCosmetic] = await Promise.all([
          tx.progression.findUniqueOrThrow({ where: { userId } }),
          tx.userCosmetic.findUnique({ where: { userId_itemId: { userId, itemId } } }),
        ]);

        if (!canPurchaseShopItem(progression.coins, itemDefinition.price, existingCosmetic !== null)) {
          if (existingCosmetic !== null) {
            throw new ForbiddenException("Vec imas ovaj predmet");
          }
          throw new HttpException("Nemas dovoljno coins-a za ovaj predmet", HttpStatus.PAYMENT_REQUIRED);
        }

        await tx.userCosmetic.create({ data: { userId, itemId } });
        const updated = await tx.progression.update({
          where: { userId },
          data: { coins: { decrement: itemDefinition.price } },
        });
        return updated.coins;
      });

      return {
        item: toDto(itemDefinition.id, itemDefinition.category, itemDefinition.price, true, false),
        coins,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenException("Vec imas ovaj predmet");
      }
      throw error;
    }
  }

  async equip(userId: string, itemId: string): Promise<ShopItemDto[]> {
    const itemDefinition = getShopItem(itemId);
    if (!itemDefinition) {
      throw new NotFoundException("Predmet nije pronadjen");
    }

    const owned = await this.prisma.userCosmetic.findUnique({ where: { userId_itemId: { userId, itemId } } });
    if (!owned) {
      throw new ForbiddenException("Nemas ovaj predmet u vlasnistvu");
    }

    await this.setEquipped(userId, itemDefinition.category, itemId);
    return this.list(userId);
  }

  async unequip(userId: string, category: ShopCategory): Promise<ShopItemDto[]> {
    await this.setEquipped(userId, category, null);
    return this.list(userId);
  }

  private async setEquipped(userId: string, category: ShopCategory, itemId: string | null): Promise<void> {
    switch (category) {
      case "AVATAR_FRAME":
        await this.prisma.profile.update({ where: { userId }, data: { equippedAvatarFrameId: itemId } });
        return;
      case "TITLE":
        await this.prisma.profile.update({ where: { userId }, data: { equippedTitleId: itemId } });
        return;
    }
  }
}

function toDto(
  id: ShopItemId,
  category: ShopCategory,
  price: number,
  owned: boolean,
  equipped: boolean,
): ShopItemDto {
  const display = getShopItemDisplay(id);
  return { id, category, price, owned, equipped, ...display };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}
