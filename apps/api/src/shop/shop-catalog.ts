import { assertNever, getShopItem, type ShopItemId } from "@risesolo/domain";

export interface ShopItemDisplay {
  name: string;
  description: string;
  colorHex: string | null;
}

/**
 * Prikazni tekst po Coin Shop predmetu - namerno odvojeno od domain sloja
 * (isti princip kao ACHIEVEMENT_NOTIFICATION_CONTENT u achievements.service.ts).
 * Switch (ne Record indexing) je namerno - exhaustive check bez
 * `noUncheckedIndexedAccess` "possibly undefined" upozorenja.
 */
export function getShopItemDisplay(id: ShopItemId): ShopItemDisplay {
  switch (id) {
    case "FRAME_BRONZE":
      return { name: "Bronzani okvir", description: "Skroman bronzani okvir oko tvog avatara.", colorHex: "#CD7F32" };
    case "FRAME_SILVER":
      return { name: "Srebrni okvir", description: "Blistavi srebrni okvir oko tvog avatara.", colorHex: "#C0C0C0" };
    case "FRAME_GOLD":
      return { name: "Zlatni okvir", description: "Raskosan zlatni okvir oko tvog avatara.", colorHex: "#FFD700" };
    case "FRAME_EMERALD":
      return { name: "Smaragdni okvir", description: "Redak smaragdni okvir oko tvog avatara.", colorHex: "#50C878" };
    case "FRAME_CRIMSON":
      return { name: "Grimizni okvir", description: "Legendarni grimizni okvir oko tvog avatara.", colorHex: "#DC143C" };
    case "TITLE_NOVICE":
      return { name: "Novajlija", description: "Titula za tvoje prve korake u System-u.", colorHex: null };
    case "TITLE_DISCIPLINED":
      return { name: "Disciplinovani", description: "Titula za dosledne igrace.", colorHex: null };
    case "TITLE_RELENTLESS":
      return { name: "Neumoljivi", description: "Titula za one koji nikad ne odustaju.", colorHex: null };
    case "TITLE_CHAMPION":
      return { name: "Sampion", description: "Titula za elitne igrace.", colorHex: null };
    case "TITLE_LEGEND":
      return { name: "Legenda", description: "Najvisa titula u System-u.", colorHex: null };
    default:
      return assertNever(id, "Nepoznat shop itemId");
  }
}

/**
 * Bezbedna varijanta za podatke koji dolaze iz baze (npr.
 * Profile.equippedTitleId) - String kolona ne garantuje da id i dalje
 * postoji u katalogu (predmet uklonjen iz SHOP_ITEMS), pa vraca `null`
 * umesto da baci gresku preko `getShopItemDisplay`.
 */
export function getShopItemDisplayById(id: string): ShopItemDisplay | null {
  const definition = getShopItem(id);
  return definition ? getShopItemDisplay(definition.id) : null;
}
