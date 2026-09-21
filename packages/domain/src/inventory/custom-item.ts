/**
 * Custom Items - sedmi i poslednji izvor u Inventory sistemu, ODVOJEN od
 * svih prethodnih po tome sto NEMA fiksni katalog definicija (svih 6
 * prethodnih izvora ima tacno 5 unapred definisanih ID-jeva). Igrac SAM
 * pise name/description (POST /inventory/custom/create), isti princip
 * "korisnik je autor" kao Claude kod AI_GENERATED, samo sto ovde tekst NE
 * generise AI vec sam igrac - zato nema Pro/AI gate. Umesto katalog uslova,
 * gate je: cena u coins-ima (kao Workshop, ali BEZ nivo uslova - kreativnost
 * ne trazi majstorstvo) I ogranicen broj "slotova" (MAX_COUNT) po igracu -
 * potpuno nova osa u odnosu na fiksni katalog svih ostalih izvora.
 */

export const CUSTOM_ITEM_MAX_COUNT = 5;
export const CUSTOM_ITEM_COIN_COST = 400;

export const CUSTOM_ITEM_NAME_MAX_LENGTH = 60;
export const CUSTOM_ITEM_DESCRIPTION_MAX_LENGTH = 300;

/** Ne moze napraviti novi Custom Item bez dovoljno coins-a, niti preko granice broja slotova. */
export function canCreateCustomItem(coins: number, currentCustomItemCount: number): boolean {
  return currentCustomItemCount < CUSTOM_ITEM_MAX_COUNT && coins >= CUSTOM_ITEM_COIN_COST;
}
