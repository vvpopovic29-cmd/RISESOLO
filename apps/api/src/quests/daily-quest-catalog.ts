import { assertNever, type DailyQuestKind } from "@risesolo/domain";

export interface DailyQuestDisplay {
  title: string;
  description: string;
}

/**
 * Prikazni tekst po dnevnom quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getShopItemDisplay u ../shop/shop-catalog.ts). Switch (ne
 * Record indexing) je namerno - exhaustive check preko assertNever.
 */
export function getDailyQuestDisplay(kind: DailyQuestKind): DailyQuestDisplay {
  switch (kind) {
    case "WORKOUT_COMPLETE":
      return {
        title: "Zavrsi danasnji trening",
        description: "Odradi bar jedan kompletan trening danas da osvojis dnevnu nagradu.",
      };
    case "LOG_NUTRITION":
      return {
        title: "Uloguj obrok",
        description: "Dodaj bar jedan unos ishrane danas da osvojis dnevnu nagradu.",
      };
    default:
      return assertNever(kind, "Nepoznat dnevni quest kind");
  }
}
