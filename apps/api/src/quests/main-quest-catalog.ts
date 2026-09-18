import { assertNever, type MainQuestKind } from "@risesolo/domain";

export interface MainQuestDisplay {
  title: string;
  description: string;
}

const STAT_LABEL: Record<MainQuestKind, string> = {
  strength: "Snagu",
  agility: "Agilnost",
  endurance: "Izdrzljivost",
  vitality: "Vitalnost",
  intelligence: "Inteligenciju",
};

/**
 * Prikazni tekst po Main Quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getWeeklyQuestDisplay). Za razliku od dnevnog/nedeljnog
 * questa, cilj (`target`) NIJE fiksna domain konstanta vec raste po tier-u
 * (vidi mainQuestTarget) - zato je parametar, ne uvek isti tekst.
 */
export function getMainQuestDisplay(kind: MainQuestKind, target: number): MainQuestDisplay {
  const label = STAT_LABEL[kind];
  switch (kind) {
    case "strength":
    case "agility":
    case "endurance":
    case "vitality":
    case "intelligence":
      return {
        title: `Povecaj ${label}`,
        description: `Dostigni ${target} poena u statu ${label.toLowerCase()} (raspodelom stat poena posle level-up-a) da osvojis nagradu.`,
      };
    default:
      return assertNever(kind, "Nepoznat Main Quest kind");
  }
}
