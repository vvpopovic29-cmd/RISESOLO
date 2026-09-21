import { assertNever, DEFAULT_LOCALE, getShopItem, type Locale, type ShopItemId } from "@risesolo/domain";

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
export function getShopItemDisplay(id: ShopItemId, locale: Locale = DEFAULT_LOCALE): ShopItemDisplay {
  const en = locale === "en";
  switch (id) {
    case "FRAME_BRONZE":
      return en
        ? { name: "Bronze Frame", description: "A modest bronze frame around your avatar.", colorHex: "#CD7F32" }
        : { name: "Bronzani okvir", description: "Skroman bronzani okvir oko tvog avatara.", colorHex: "#CD7F32" };
    case "FRAME_SILVER":
      return en
        ? { name: "Silver Frame", description: "A gleaming silver frame around your avatar.", colorHex: "#C0C0C0" }
        : { name: "Srebrni okvir", description: "Blistavi srebrni okvir oko tvog avatara.", colorHex: "#C0C0C0" };
    case "FRAME_GOLD":
      return en
        ? { name: "Gold Frame", description: "A lavish gold frame around your avatar.", colorHex: "#FFD700" }
        : { name: "Zlatni okvir", description: "Raskosan zlatni okvir oko tvog avatara.", colorHex: "#FFD700" };
    case "FRAME_EMERALD":
      return en
        ? { name: "Emerald Frame", description: "A rare emerald frame around your avatar.", colorHex: "#50C878" }
        : { name: "Smaragdni okvir", description: "Redak smaragdni okvir oko tvog avatara.", colorHex: "#50C878" };
    case "FRAME_CRIMSON":
      return en
        ? { name: "Crimson Frame", description: "A legendary crimson frame around your avatar.", colorHex: "#DC143C" }
        : { name: "Grimizni okvir", description: "Legendarni grimizni okvir oko tvog avatara.", colorHex: "#DC143C" };
    case "TITLE_NOVICE":
      return en
        ? { name: "Novice", description: "A title for your first steps in the System.", colorHex: null }
        : { name: "Novajlija", description: "Titula za tvoje prve korake u System-u.", colorHex: null };
    case "TITLE_DISCIPLINED":
      return en
        ? { name: "Disciplined", description: "A title for consistent players.", colorHex: null }
        : { name: "Disciplinovani", description: "Titula za dosledne igrace.", colorHex: null };
    case "TITLE_RELENTLESS":
      return en
        ? { name: "Relentless", description: "A title for those who never give up.", colorHex: null }
        : { name: "Neumoljivi", description: "Titula za one koji nikad ne odustaju.", colorHex: null };
    case "TITLE_CHAMPION":
      return en
        ? { name: "Champion", description: "A title for elite players.", colorHex: null }
        : { name: "Sampion", description: "Titula za elitne igrace.", colorHex: null };
    case "TITLE_LEGEND":
      return en
        ? { name: "Legend", description: "The highest title in the System.", colorHex: null }
        : { name: "Legenda", description: "Najvisa titula u System-u.", colorHex: null };
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
export function getShopItemDisplayById(id: string, locale: Locale = DEFAULT_LOCALE): ShopItemDisplay | null {
  const definition = getShopItem(id);
  return definition ? getShopItemDisplay(definition.id, locale) : null;
}
