import { assertNever, WEEKLY_NUTRITION_LOG_DAYS_TARGET, WEEKLY_XP_TARGET, type WeeklyQuestKind } from "@risesolo/domain";

export interface WeeklyQuestDisplay {
  title: string;
  description: string;
}

/**
 * Prikazni tekst po nedeljnom quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getDailyQuestDisplay u ../quests/daily-quest-catalog.ts).
 * Switch (ne Record indexing) je namerno - exhaustive check preko assertNever.
 */
export function getWeeklyQuestDisplay(kind: WeeklyQuestKind): WeeklyQuestDisplay {
  switch (kind) {
    case "XP_TARGET":
      return {
        title: "Nedeljni XP izazov",
        description: `Osvoji ${WEEKLY_XP_TARGET} XP ove nedelje (iz bilo kog izvora) da osvojis nedeljnu nagradu.`,
      };
    case "NUTRITION_LOG_DAYS":
      return {
        title: "Nedeljni cilj ishrane",
        description: `Uloguj obrok tokom ${WEEKLY_NUTRITION_LOG_DAYS_TARGET} razlicita dana ove nedelje da osvojis nedeljnu nagradu.`,
      };
    default:
      return assertNever(kind, "Nepoznat nedeljni quest kind");
  }
}
