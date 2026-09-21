import { assertNever, DEFAULT_LOCALE, type DailyQuestKind, type Locale } from "@risesolo/domain";

export interface DailyQuestDisplay {
  title: string;
  description: string;
}

/**
 * Prikazni tekst po dnevnom quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getShopItemDisplay u ../shop/shop-catalog.ts). Switch (ne
 * Record indexing) je namerno - exhaustive check preko assertNever. `locale`
 * je opcion (podrazumeva DEFAULT_LOCALE) da postojeci pozivi bez tog
 * argumenta ostanu validni.
 */
export function getDailyQuestDisplay(kind: DailyQuestKind, locale: Locale = DEFAULT_LOCALE): DailyQuestDisplay {
  const en = locale === "en";
  switch (kind) {
    case "WORKOUT_COMPLETE":
      return en
        ? { title: "Finish today's workout", description: "Complete at least one full workout today to earn the daily reward." }
        : {
            title: "Zavrsi danasnji trening",
            description: "Odradi bar jedan kompletan trening danas da osvojis dnevnu nagradu.",
          };
    case "LOG_NUTRITION":
      return en
        ? { title: "Log a meal", description: "Add at least one nutrition entry today to earn the daily reward." }
        : {
            title: "Uloguj obrok",
            description: "Dodaj bar jedan unos ishrane danas da osvojis dnevnu nagradu.",
          };
    default:
      return assertNever(kind, "Nepoznat dnevni quest kind");
  }
}
