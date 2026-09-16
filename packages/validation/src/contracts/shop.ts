import { SHOP_CATEGORIES } from "@risesolo/domain";
import { z } from "zod";

/** GET /shop - ceo katalog (i kupljeno i nekupljeno), obogacen prikaznim tekstom na serveru (vidi apps/api/src/shop). */
export const shopItemSchema = z.object({
  id: z.string(),
  category: z.enum(SHOP_CATEGORIES),
  name: z.string(),
  description: z.string(),
  price: z.number().int().min(0),
  /** AVATAR_FRAME -> hex boja ivice; TITLE -> null (nema vizuelnu boju). */
  colorHex: z.string().nullable(),
  owned: z.boolean(),
  equipped: z.boolean(),
});
export type ShopItemDto = z.infer<typeof shopItemSchema>;

export const listShopResponseSchema = z.array(shopItemSchema);
export type ListShopResponse = z.infer<typeof listShopResponseSchema>;

export const purchaseShopItemRequestSchema = z.object({
  itemId: z.string().min(1),
});
export type PurchaseShopItemRequest = z.infer<typeof purchaseShopItemRequestSchema>;

/** `coins` je preostali saldo POSLE kupovine - klijent ne mora dodatan poziv da osvezi PlayerStateDto.progression.coins. */
export const purchaseShopItemResponseSchema = z.object({
  item: shopItemSchema,
  coins: z.number().int().min(0),
});
export type PurchaseShopItemResponse = z.infer<typeof purchaseShopItemResponseSchema>;

export const equipShopItemRequestSchema = z.object({
  itemId: z.string().min(1),
});
export type EquipShopItemRequest = z.infer<typeof equipShopItemRequestSchema>;
