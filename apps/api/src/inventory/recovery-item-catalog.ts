import { assertNever, DEFAULT_LOCALE, type Locale, type RecoveryItemId } from "@risesolo/domain";

export interface RecoveryItemDisplay {
  name: string;
  description: string;
}

/**
 * Prikazni tekst po Recovery Item-u - namerno odvojeno od domain sloja
 * (isti princip kao getGuildItemDisplay/getHiddenItemDisplay). Katalog je,
 * kao Guild, UVEK vidljiv - tekst se vraca bez obzira na otkriveno stanje.
 */
export function getRecoveryItemDisplay(id: RecoveryItemId, locale: Locale = DEFAULT_LOCALE): RecoveryItemDisplay {
  const en = locale === "en";
  switch (id) {
    case "FIRST_REST_DAY":
      return en
        ? { name: "First Rest Day", description: "You rested at least one full day between two workouts." }
        : { name: "Prvi Odmor", description: "Odmorio si bar jedan pun dan izmedju dva treninga." };
    case "THE_COMEBACK":
      return en
        ? { name: "The Comeback", description: "You returned to training after a break of 5 or more days." }
        : { name: "Povratak", description: "Vratio si se na trening posle pauze od 5 ili vise dana." };
    case "RESTED_ROUTINE":
      return en
        ? { name: "Rested Routine", description: "You rested between workouts at least 3 times - rest is part of your rhythm." }
        : { name: "Ritam Oporavka", description: "Odmorio si se izmedju treninga bar 3 puta - odmor je deo tvog ritma." };
    case "LONG_HAUL_RETURN":
      return en
        ? { name: "Long Haul Return", description: "You returned to training after a break of 10 or more days." }
        : { name: "Veliki Povratak", description: "Vratio si se na trening posle pauze od 10 ili vise dana." };
    case "MARATHON_PATIENCE":
      return en
        ? {
            name: "Marathon Patience",
            description: "You trained on 30 or more different days and knew when to rest along the way.",
          }
        : {
            name: "Strpljenje Maratonca",
            description: "Trenirao si 30 ili vise razlicitih dana i pri tom znao kad da se odmoris.",
          };
    default:
      return assertNever(id, "Nepoznat recovery itemId");
  }
}
