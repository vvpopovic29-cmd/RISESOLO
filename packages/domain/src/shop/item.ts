/**
 * Coin Shop - kozmetika kupljena za coins (jedina dosadasnja potrosnja
 * coins-a je bila guild riznica - ovo daje coins-ima licnu svrhu). Isti
 * princip kao achievements: katalog je cist podatak u domain sloju (bez
 * prikaznog teksta - to zivi u apps/api, isti princip kao
 * ACHIEVEMENT_NOTIFICATION_CONTENT), kupovina/vlasnistvo se NIKAD ne
 * pretpostavlja klijentski, uvek se proverava na serveru.
 */

export const SHOP_CATEGORIES = ["AVATAR_FRAME", "TITLE"] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export const SHOP_ITEM_IDS = [
  "FRAME_BRONZE",
  "FRAME_SILVER",
  "FRAME_GOLD",
  "FRAME_EMERALD",
  "FRAME_CRIMSON",
  "TITLE_NOVICE",
  "TITLE_DISCIPLINED",
  "TITLE_RELENTLESS",
  "TITLE_CHAMPION",
  "TITLE_LEGEND",
] as const;
export type ShopItemId = (typeof SHOP_ITEM_IDS)[number];

export interface ShopItemDefinition {
  id: ShopItemId;
  category: ShopCategory;
  price: number;
}

export const SHOP_ITEMS: readonly ShopItemDefinition[] = [
  { id: "FRAME_BRONZE", category: "AVATAR_FRAME", price: 100 },
  { id: "FRAME_SILVER", category: "AVATAR_FRAME", price: 300 },
  { id: "FRAME_GOLD", category: "AVATAR_FRAME", price: 600 },
  { id: "FRAME_EMERALD", category: "AVATAR_FRAME", price: 1000 },
  { id: "FRAME_CRIMSON", category: "AVATAR_FRAME", price: 1500 },
  { id: "TITLE_NOVICE", category: "TITLE", price: 50 },
  { id: "TITLE_DISCIPLINED", category: "TITLE", price: 250 },
  { id: "TITLE_RELENTLESS", category: "TITLE", price: 500 },
  { id: "TITLE_CHAMPION", category: "TITLE", price: 1000 },
  { id: "TITLE_LEGEND", category: "TITLE", price: 2000 },
];

export function getShopItem(id: string): ShopItemDefinition | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}

/** Ne moze kupiti nesto sto vec ima, niti nesto skuplje od trenutnih coins-a. */
export function canPurchaseShopItem(coins: number, price: number, alreadyOwned: boolean): boolean {
  return !alreadyOwned && coins >= price;
}
