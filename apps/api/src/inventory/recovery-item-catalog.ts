import { assertNever, type RecoveryItemId } from "@risesolo/domain";

export interface RecoveryItemDisplay {
  name: string;
  description: string;
}

/**
 * Prikazni tekst po Recovery Item-u - namerno odvojeno od domain sloja
 * (isti princip kao getGuildItemDisplay/getHiddenItemDisplay). Katalog je,
 * kao Guild, UVEK vidljiv - tekst se vraca bez obzira na otkriveno stanje.
 */
export function getRecoveryItemDisplay(id: RecoveryItemId): RecoveryItemDisplay {
  switch (id) {
    case "FIRST_REST_DAY":
      return { name: "Prvi Odmor", description: "Odmorio si bar jedan pun dan izmedju dva treninga." };
    case "THE_COMEBACK":
      return { name: "Povratak", description: "Vratio si se na trening posle pauze od 5 ili vise dana." };
    case "RESTED_ROUTINE":
      return { name: "Ritam Oporavka", description: "Odmorio si se izmedju treninga bar 3 puta - odmor je deo tvog ritma." };
    case "LONG_HAUL_RETURN":
      return { name: "Veliki Povratak", description: "Vratio si se na trening posle pauze od 10 ili vise dana." };
    case "MARATHON_PATIENCE":
      return {
        name: "Strpljenje Maratonca",
        description: "Trenirao si 30 ili vise razlicitih dana i pri tom znao kad da se odmoris.",
      };
    default:
      return assertNever(id, "Nepoznat recovery itemId");
  }
}
