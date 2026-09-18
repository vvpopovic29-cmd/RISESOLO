/**
 * Workshop Items - drugi izvor u Inventory sistemu, ODVOJEN od Hidden Items
 * (tajni uslov) i od Coin Shop-a (kozmetika, bez praga nivoa, odmah
 * opremljivo). Workshop predmet je unapred VIDLJIV u katalogu (naziv/opis/
 * cena/nivo su poznati pre izrade - za razliku od Hidden Item-a), ali
 * zahteva da igrac AKTIVNO "izradi" predmet (mutirajuca akcija, POST) - nivo
 * (majstorstvo) I coins zajedno, za razliku od Shop-a koji trazi samo coins.
 * Izradjen predmet zauvek ostaje u vlasnistvu (isti princip kao
 * UserCosmetic/Hidden Item) - InventoryItem sa `source: "WORKSHOP"`.
 */

export const WORKSHOP_ITEM_IDS = [
  "IRON_TALISMAN",
  "STEEL_EMBLEM",
  "MYTHRIL_RELIC",
  "DRAGONBONE_CHARM",
  "CELESTIAL_SIGIL",
] as const;
export type WorkshopItemId = (typeof WORKSHOP_ITEM_IDS)[number];

export interface WorkshopItemDefinition {
  id: WorkshopItemId;
  levelRequirement: number;
  coinCost: number;
}

export const WORKSHOP_ITEMS: readonly WorkshopItemDefinition[] = [
  { id: "IRON_TALISMAN", levelRequirement: 3, coinCost: 200 },
  { id: "STEEL_EMBLEM", levelRequirement: 6, coinCost: 500 },
  { id: "MYTHRIL_RELIC", levelRequirement: 10, coinCost: 1200 },
  { id: "DRAGONBONE_CHARM", levelRequirement: 15, coinCost: 2500 },
  { id: "CELESTIAL_SIGIL", levelRequirement: 20, coinCost: 5000 },
];

export function getWorkshopItem(id: string): WorkshopItemDefinition | undefined {
  return WORKSHOP_ITEMS.find((item) => item.id === id);
}

/** Ne moze izraditi nesto sto vec ima, niti bez dovoljnog nivoa/coins-a. */
export function canCraftWorkshopItem(
  level: number,
  coins: number,
  definition: Pick<WorkshopItemDefinition, "levelRequirement" | "coinCost">,
  alreadyOwned: boolean,
): boolean {
  return !alreadyOwned && level >= definition.levelRequirement && coins >= definition.coinCost;
}
