import { assertNever, type EventItemId } from "@risesolo/domain";

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
export function getEventItemDisplay(id: EventItemId): EventItemDisplay {
  switch (id) {
    case "NEW_YEAR_RESOLUTION":
      return { name: "Novogodisnja Odluka", description: "Prisvoji tokom prve dve nedelje januara - pocni godinu jako." };
    case "SPRING_AWAKENING":
      return { name: "Prolecno Budjenje", description: "Prisvoji krajem marta / pocetkom aprila, uz dolazak proleca." };
    case "SUMMER_SHRED":
      return { name: "Letnje Isklesavanje", description: "Prisvoji tokom juna, dok se spremas za leto." };
    case "AUTUMN_HARVEST":
      return { name: "Jesenja Zetva", description: "Prisvoji tokom septembra - vreme da pozanjes plodove svog rada." };
    case "WINTER_WARRIOR":
      return { name: "Zimski Ratnik", description: "Prisvoji tokom decembra - ne odustaj ni kad je najhladnije." };
    default:
      return assertNever(id, "Nepoznat event itemId");
  }
}
