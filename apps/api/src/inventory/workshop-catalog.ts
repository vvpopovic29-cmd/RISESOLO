import { assertNever, DEFAULT_LOCALE, getWorkshopItem, type Locale, type WorkshopItemId } from "@risesolo/domain";

export interface WorkshopItemDisplay {
  name: string;
  description: string;
}

/**
 * Prikazni tekst po Workshop predmetu - namerno odvojeno od domain sloja
 * (isti princip kao getShopItemDisplay/getHiddenItemDisplay). Za razliku od
 * Hidden Item-a, ovaj tekst se vraca UVEK (izradjeno ili ne) - Workshop
 * katalog je unapred poznat, "tajna" je samo kod Hidden Item-a.
 */
export function getWorkshopItemDisplay(id: WorkshopItemId, locale: Locale = DEFAULT_LOCALE): WorkshopItemDisplay {
  const en = locale === "en";
  switch (id) {
    case "IRON_TALISMAN":
      return en
        ? { name: "Iron Talisman", description: "The first workshop item - modest, but a reliable companion." }
        : { name: "Gvozdeni Talisman", description: "Prvi predmet iz radionice - skroman, ali pouzdan pratilac." };
    case "STEEL_EMBLEM":
      return en
        ? { name: "Steel Emblem", description: "An emblem forged for those who have proven their dedication." }
        : { name: "Celicni Amblem", description: "Amblem iskovan za one koji su dokazali svoju posvecenost." };
    case "MYTHRIL_RELIC":
      return en
        ? { name: "Mythril Relic", description: "A rare material, available only to seasoned craftsmen." }
        : { name: "Mitrilska Relikvija", description: "Redak materijal, dostupan samo iskusnim majstorima." };
    case "DRAGONBONE_CHARM":
      return en
        ? { name: "Dragonbone Charm", description: "A legendary material for legendary warriors." }
        : { name: "Amajlija od Zmajeve Kosti", description: "Legendarni materijal za legendarne ratnike." };
    case "CELESTIAL_SIGIL":
      return en
        ? { name: "Celestial Sigil", description: "The pinnacle of workshop craftsmanship - few ever forge it." }
        : { name: "Nebeski Pecat", description: "Vrhunac majstorstva radionice - retko ko ga ikad izradi." };
    default:
      return assertNever(id, "Nepoznat workshop itemId");
  }
}

/**
 * Bezbedna varijanta za podatke koji dolaze iz baze - isti princip kao
 * getShopItemDisplayById (katalog moze da se promeni, String kolona ne
 * garantuje da id i dalje postoji u WORKSHOP_ITEMS).
 */
export function getWorkshopItemDisplayById(id: string, locale: Locale = DEFAULT_LOCALE): WorkshopItemDisplay | null {
  const definition = getWorkshopItem(id);
  return definition ? getWorkshopItemDisplay(definition.id, locale) : null;
}
