import { assertNever, DEFAULT_LOCALE, type Locale, type SideQuestKind } from "@risesolo/domain";

export interface SideQuestDisplay {
  title: string;
  description: string;
}

/**
 * Prikazni tekst po Side Quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getMainQuestDisplay/getWeeklyQuestDisplay). MVP ima
 * samo jednu vrstu (NEW_EXERCISE) - switch postoji da assertNever uhvati
 * buduce dodatke na kompajl vremenu, ne zbog stvarne grananja sada.
 */
export function getSideQuestDisplay(kind: SideQuestKind, locale: Locale = DEFAULT_LOCALE): SideQuestDisplay {
  switch (kind) {
    case "NEW_EXERCISE":
      return locale === "en"
        ? { title: "New Exercise", description: "Complete a set of an exercise you've never done before to earn a bonus reward." }
        : {
            title: "Nova Vezba",
            description: "Zavrsi seriju vezbe koju nikad pre nisi radio da osvojis bonus nagradu.",
          };
    default:
      return assertNever(kind, "Nepoznat Side Quest kind");
  }
}
