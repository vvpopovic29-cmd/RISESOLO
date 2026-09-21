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

/**
 * Sirov AI izlaz (vidi apps/api/src/ai/ai.service.ts generateItemFlavor) pre
 * nego sto se upise u InventoryItem red kao generatedName/
 * generatedDescription - isti princip kao aiQuestFlavorSchema u
 * contracts/quests.ts. NIJE javni DTO - AI_GENERATED predmeti na GET
 * /inventory/ai koriste ISTI inventoryItemSchema kao Hidden Items (tajan
 * katalog, "???" dok se ne otkrije).
 */
export const aiItemFlavorSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(400),
});
export type AiItemFlavorOutput = z.infer<typeof aiItemFlavorSchema>;

/**
 * POST /inventory/custom/create - za razliku od svih ostalih izvora, igrac
 * SAM pise name/description (vidi @risesolo/domain custom-item.ts za
 * CUSTOM_ITEM_NAME_MAX_LENGTH/CUSTOM_ITEM_DESCRIPTION_MAX_LENGTH granice).
 * Nema itemId u telu zahteva - server ga generise (crypto.randomUUID()),
 * za razliku od craftWorkshopItemRequestSchema/claimEventItemRequestSchema
 * koji biraju POSTOJECI katalog ID.
 */
export const createCustomItemRequestSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
});
export type CreateCustomItemRequest = z.infer<typeof createCustomItemRequestSchema>;

/**
 * `coins` je preostali saldo POSLE kreiranja - isti princip kao
 * craftWorkshopItemResponseSchema.coins. `item` koristi isti
 * inventoryItemSchema kao GET /inventory/custom (uvek discovered:true - ne
 * postoji "zakljucano" stanje za predmet koji igrac tek sto je sam
 * napravio).
 */
export const createCustomItemResponseSchema = z.object({
  item: inventoryItemSchema,
  coins: z.number().int().min(0),
});
export type CreateCustomItemResponse = z.infer<typeof createCustomItemResponseSchema>;
