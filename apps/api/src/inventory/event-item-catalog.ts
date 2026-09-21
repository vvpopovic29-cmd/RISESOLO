import { assertNever, DEFAULT_LOCALE, type EventItemId, type Locale } from "@risesolo/domain";

export interface EventItemDisplay {
  name: string;
  description: string;
}

/**
 * Prikazni tekst po Event Item-u - namerno odvojeno od domain sloja (isti
 * princip kao getWorkshopItemDisplay/getGuildItemDisplay). Katalog je uvek
 * vidljiv (kao Workshop) - "aktivnost" (da li se moze prisvojiti SADA) se
 * racuna preko `active` polja, ne kroz sakrivanje ovog teksta.
 */
export function getEventItemDisplay(id: EventItemId, locale: Locale = DEFAULT_LOCALE): EventItemDisplay {
  const en = locale === "en";
  switch (id) {
    case "NEW_YEAR_RESOLUTION":
      return en
        ? { name: "New Year's Resolution", description: "Claim during the first two weeks of January - start the year strong." }
        : { name: "Novogodisnja Odluka", description: "Prisvoji tokom prve dve nedelje januara - pocni godinu jako." };
    case "SPRING_AWAKENING":
      return en
        ? { name: "Spring Awakening", description: "Claim in late March / early April, as spring arrives." }
        : { name: "Prolecno Budjenje", description: "Prisvoji krajem marta / pocetkom aprila, uz dolazak proleca." };
    case "SUMMER_SHRED":
      return en
        ? { name: "Summer Shred", description: "Claim during June, while you get ready for summer." }
        : { name: "Letnje Isklesavanje", description: "Prisvoji tokom juna, dok se spremas za leto." };
    case "AUTUMN_HARVEST":
      return en
        ? { name: "Autumn Harvest", description: "Claim during September - time to reap the fruits of your work." }
        : { name: "Jesenja Zetva", description: "Prisvoji tokom septembra - vreme da pozanjes plodove svog rada." };
    case "WINTER_WARRIOR":
      return en
        ? { name: "Winter Warrior", description: "Claim during December - don't give up even when it's coldest." }
        : { name: "Zimski Ratnik", description: "Prisvoji tokom decembra - ne odustaj ni kad je najhladnije." };
    default:
      return assertNever(id, "Nepoznat event itemId");
  }
}
