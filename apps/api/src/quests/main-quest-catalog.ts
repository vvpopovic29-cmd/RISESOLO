import { assertNever, DEFAULT_LOCALE, type Locale, type MainQuestKind } from "@risesolo/domain";

export interface MainQuestDisplay {
  title: string;
  description: string;
}

const STAT_LABEL: Record<Locale, Record<MainQuestKind, string>> = {
  sr: {
    strength: "Snagu",
    agility: "Agilnost",
    endurance: "Izdrzljivost",
    vitality: "Vitalnost",
    intelligence: "Inteligenciju",
  },
  en: {
    strength: "Strength",
    agility: "Agility",
    endurance: "Endurance",
    vitality: "Vitality",
    intelligence: "Intelligence",
  },
};

/**
 * Prikazni tekst po Main Quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getWeeklyQuestDisplay). Za razliku od dnevnog/nedeljnog
 * questa, cilj (`target`) NIJE fiksna domain konstanta vec raste po tier-u
 * (vidi mainQuestTarget) - zato je parametar, ne uvek isti tekst.
 */
export function getMainQuestDisplay(kind: MainQuestKind, target: number, locale: Locale = DEFAULT_LOCALE): MainQuestDisplay {
  const label = STAT_LABEL[locale][kind];
  switch (kind) {
    case "strength":
    case "agility":
    case "endurance":
    case "vitality":
    case "intelligence":
      return locale === "en"
        ? {
            title: `Increase ${label}`,
            description: `Reach ${target} points in ${label} (by allocating stat points after leveling up) to earn the reward.`,
          }
        : {
            title: `Povecaj ${label}`,
            description: `Dostigni ${target} poena u statu ${label.toLowerCase()} (raspodelom stat poena posle level-up-a) da osvojis nagradu.`,
          };
    default:
      return assertNever(kind, "Nepoznat Main Quest kind");
  }
}
