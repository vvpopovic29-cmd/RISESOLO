import {
  assertNever,
  DEFAULT_LOCALE,
  WEEKLY_NUTRITION_LOG_DAYS_TARGET,
  WEEKLY_XP_TARGET,
  type Locale,
  type WeeklyQuestKind,
} from "@risesolo/domain";

export interface WeeklyQuestDisplay {
  title: string;
  description: string;
}

/**
 * Prikazni tekst po nedeljnom quest kind-u - namerno odvojeno od domain sloja
 * (isti princip kao getDailyQuestDisplay u ../quests/daily-quest-catalog.ts).
 * Switch (ne Record indexing) je namerno - exhaustive check preko assertNever.
 */
export function getWeeklyQuestDisplay(kind: WeeklyQuestKind, locale: Locale = DEFAULT_LOCALE): WeeklyQuestDisplay {
  const en = locale === "en";
  switch (kind) {
    case "XP_TARGET":
      return en
        ? {
            title: "Weekly XP challenge",
            description: `Earn ${WEEKLY_XP_TARGET} XP this week (from any source) to earn the weekly reward.`,
          }
        : {
            title: "Nedeljni XP izazov",
            description: `Osvoji ${WEEKLY_XP_TARGET} XP ove nedelje (iz bilo kog izvora) da osvojis nedeljnu nagradu.`,
          };
    case "NUTRITION_LOG_DAYS":
      return en
        ? {
            title: "Weekly nutrition goal",
            description: `Log a meal on ${WEEKLY_NUTRITION_LOG_DAYS_TARGET} different days this week to earn the weekly reward.`,
          }
        : {
            title: "Nedeljni cilj ishrane",
            description: `Uloguj obrok tokom ${WEEKLY_NUTRITION_LOG_DAYS_TARGET} razlicita dana ove nedelje da osvojis nedeljnu nagradu.`,
          };
    default:
      return assertNever(kind, "Nepoznat nedeljni quest kind");
  }
}
