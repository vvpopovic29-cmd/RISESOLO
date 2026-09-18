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
