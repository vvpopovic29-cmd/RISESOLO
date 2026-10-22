import { ACHIEVEMENT_IDS } from "@risesolo/domain";
import en from "../i18n/locales/en";
import sr from "../i18n/locales/sr";
import { getAchievementDisplay } from "./achievement-display";

type Messages = Record<string, Record<string, string>>;

function makeTranslate(messages: Messages) {
  return ((key: string) => {
    const [namespace, field] = key.split(".") as [string, string];
    return messages[namespace]?.[field] ?? `MISSING:${key}`;
  }) as Parameters<typeof getAchievementDisplay>[1];
}

describe("getAchievementDisplay", () => {
  for (const [locale, messages] of [["en", en], ["sr", sr]] as const) {
    it(`svaki achievement ima naslov, opis i ikonu (${locale}) - bez nedostajucih prevoda`, () => {
      const t = makeTranslate(messages as unknown as Messages);

      for (const id of ACHIEVEMENT_IDS) {
        const display = getAchievementDisplay(id, t);
        expect({ id, title: display.title.startsWith("MISSING:") }).toEqual({ id, title: false });
        expect({ id, description: display.description.startsWith("MISSING:") }).toEqual({ id, description: false });
        expect(display.title.trim()).not.toBe("");
        expect(display.icon.trim()).not.toBe("");
      }
    });
  }

  it("razliciti achievement-i imaju razlicite naslove", () => {
    const t = makeTranslate(en as unknown as Messages);
    const titles = ACHIEVEMENT_IDS.map((id) => getAchievementDisplay(id, t).title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
