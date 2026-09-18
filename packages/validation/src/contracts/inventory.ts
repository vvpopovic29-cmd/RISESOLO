import { ITEM_SOURCES } from "@risesolo/domain";
import { z } from "zod";

/**
 * GET /inventory - ceo katalog (i otkriveno i neotkriveno). `id` je
 * z.string() (ne enum) namerno - isti princip kao ShopItemDto.id, kasnije
 * izvori (WORKSHOP/EVENT/...) donose sopstvene ID-jeve bez potrebe da se
 * ovaj kontrakt menja. Neotkriven predmet NIKAD ne salje name/description
 * (ostaje "???" u UI) - uslov otkljucavanja je namerno tajna, ne samo
 * klijentski sakriven prikaz.
 */
export const inventoryItemSchema = z.object({
  id: z.string(),
  source: z.enum(ITEM_SOURCES),
  discovered: z.boolean(),
  discoveredAt: z.string().datetime().nullable(),
  name: z.string().nullable(),
  description: z.string().nullable(),
});
export type InventoryItemDto = z.infer<typeof inventoryItemSchema>;

export const listInventoryResponseSchema = z.array(inventoryItemSchema);
export type ListInventoryResponse = z.infer<typeof listInventoryResponseSchema>;

/**
 * GET /inventory/workshop - ceo katalog (i izradjeno i neizradjeno). Za
 * razliku od inventoryItemSchema (Hidden Item - name/description tajna dok
 * se ne otkrije), Workshop katalog je UNAPRED vidljiv - name/description/
 * levelRequirement/coinCost se uvek salju, `owned` samo govori da li je
 * igrac vec izradio taj predmet.
 */
export const workshopItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  levelRequirement: z.number().int().min(1),
  coinCost: z.number().int().min(0),
  owned: z.boolean(),
});
export type WorkshopItemDto = z.infer<typeof workshopItemSchema>;

export const listWorkshopResponseSchema = z.array(workshopItemSchema);
export type ListWorkshopResponse = z.infer<typeof listWorkshopResponseSchema>;

export const craftWorkshopItemRequestSchema = z.object({
  itemId: z.string().min(1),
});
export type CraftWorkshopItemRequest = z.infer<typeof craftWorkshopItemRequestSchema>;

/** `coins` je preostali saldo POSLE izrade - isti princip kao PurchaseShopItemResponse.coins. */
export const craftWorkshopItemResponseSchema = z.object({
  item: workshopItemSchema,
  coins: z.number().int().min(0),
});
export type CraftWorkshopItemResponse = z.infer<typeof craftWorkshopItemResponseSchema>;

/**
 * GET /inventory/event - ceo katalog (i prisvojeno i neprisvojeno). Kao
 * Workshop, katalog je unapred vidljiv (name/description se uvek salju), ali
 * BEZ cene/nivoa - umesto toga `active` govori da li je tekuci datum unutar
 * godisnjeg prozora dogadjaja (vidi @risesolo/domain isEventActive). Van
 * prozora se ne moze prisvojiti (POST /inventory/event/claim odbija), cak i
 * ako igrac zadovoljava sve ostalo.
 */
export const eventItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  active: z.boolean(),
  owned: z.boolean(),
});
export type EventItemDto = z.infer<typeof eventItemSchema>;

export const listEventResponseSchema = z.array(eventItemSchema);
export type ListEventResponse = z.infer<typeof listEventResponseSchema>;

export const claimEventItemRequestSchema = z.object({
  itemId: z.string().min(1),
});
export type ClaimEventItemRequest = z.infer<typeof claimEventItemRequestSchema>;

export const claimEventItemResponseSchema = z.object({
  item: eventItemSchema,
});
export type ClaimEventItemResponse = z.infer<typeof claimEventItemResponseSchema>;
