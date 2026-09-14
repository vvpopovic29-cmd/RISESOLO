import { QUEST_DEFINITIONS } from "./definitions";
import {
  completeQuest,
  expireQuest,
  generateDailyQuest,
  hasExpired,
  pickQuestDefinition,
  resolveDailyQuest,
  updateQuestProgress,
} from "./quest";
import type { DailyQuest } from "./quest.types";

const USER = "user-123";
const DATE = "2026-09-14";
const NOON = new Date("2026-09-14T12:00:00.000Z");
const AFTER_EXPIRY = new Date("2026-09-15T00:00:01.000Z");

describe("Quest generator", () => {
  it("pickQuestDefinition je deterministicki - isti user+date uvek isti sablon", () => {
    const first = pickQuestDefinition(USER, DATE);
    const second = pickQuestDefinition(USER, DATE);
    expect(first).toBe(second);
  });

  it("pickQuestDefinition uvek bira sablon iz kataloga", () => {
    const definition = pickQuestDefinition(USER, DATE);
    expect(QUEST_DEFINITIONS).toContain(definition);
  });

  it("razliciti dani (obicno) daju razlicite questove za istog korisnika", () => {
    const definitions = new Set(
      Array.from(
        { length: 10 },
        (_, i) => pickQuestDefinition(USER, `2026-09-${String(i + 1).padStart(2, "0")}`).id,
      ),
    );
    expect(definitions.size).toBeGreaterThan(1);
  });

  it("generateDailyQuest vraca AVAILABLE quest sa progressValue 0", () => {
    const quest = generateDailyQuest(USER, DATE);
    expect(quest.userId).toBe(USER);
    expect(quest.date).toBe(DATE);
    expect(quest.status).toBe("AVAILABLE");
    expect(quest.progressValue).toBe(0);
    expect(quest.completedAt).toBeNull();
    expect(quest.id).toBe(`daily-${USER}-${DATE}`);
  });

  it("generateDailyQuest je deterministicka - isti poziv, isti rezultat (bezbedno za paralelne zahteve)", () => {
    expect(generateDailyQuest(USER, DATE)).toEqual(generateDailyQuest(USER, DATE));
  });

  it("baca gresku za nevalidan datum ili prazan userId", () => {
    expect(() => generateDailyQuest(USER, "not-a-date")).toThrow(RangeError);
    expect(() => generateDailyQuest("", DATE)).toThrow(RangeError);
  });

  describe("resolveDailyQuest", () => {
    it("vraca postojeci quest ako je prosledjen (ne generise nov)", () => {
      const existing = generateDailyQuest(USER, DATE);
      const modified: DailyQuest = { ...existing, progressValue: 5, status: "IN_PROGRESS" };
      expect(resolveDailyQuest(USER, DATE, modified)).toBe(modified);
    });

    it("generise nov quest ako ne postoji", () => {
      expect(resolveDailyQuest(USER, DATE, null)).toEqual(generateDailyQuest(USER, DATE));
    });
  });
});

describe("Quest lifecycle", () => {
  function questWithTarget(targetValue: number): DailyQuest {
    return { ...generateDailyQuest(USER, DATE), targetValue };
  }

  describe("updateQuestProgress", () => {
    it("AVAILABLE -> IN_PROGRESS cim progres postane > 0", () => {
      const quest = questWithTarget(50);
      const result = updateQuestProgress(quest, 10, NOON);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe("IN_PROGRESS");
        expect(result.value.progressValue).toBe(10);
      }
    });

    it("odbija negativan ili necio progres", () => {
      const quest = questWithTarget(50);
      expect(updateQuestProgress(quest, -1, NOON).ok).toBe(false);
      expect(updateQuestProgress(quest, 1.5, NOON).ok).toBe(false);
    });

    it("odbija azuriranje vec zavrsenog questa", () => {
      const quest: DailyQuest = { ...questWithTarget(50), status: "COMPLETED", progressValue: 50 };
      const result = updateQuestProgress(quest, 60, NOON);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual({ reason: "ALREADY_COMPLETED" });
    });

    it("odbija azuriranje isteklog questa (i po statusu i po vremenu)", () => {
      const quest = questWithTarget(50);
      const result = updateQuestProgress(quest, 10, AFTER_EXPIRY);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual({ reason: "EXPIRED" });
    });
  });

  describe("completeQuest", () => {
    it("odbija zavrsetak ako progressValue < targetValue (ne veruje frontend `completed: true` flag-u)", () => {
      const quest: DailyQuest = {
        ...questWithTarget(50),
        progressValue: 49,
        status: "IN_PROGRESS",
      };
      const result = completeQuest(quest, NOON);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ reason: "TARGET_NOT_MET", required: 50, actual: 49 });
      }
    });

    it("uspesno zavrsava quest kada je progressValue >= targetValue i vraca nagradu", () => {
      const quest: DailyQuest = {
        ...questWithTarget(50),
        progressValue: 50,
        status: "IN_PROGRESS",
      };
      const result = completeQuest(quest, NOON);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.quest.status).toBe("COMPLETED");
        expect(result.value.quest.completedAt).toBe(NOON.toISOString());
        expect(result.value.reward).toEqual(quest.reward);
      }
    });

    it("odbija dupli zavrsetak - drugi COMPLETE ne daje drugu nagradu", () => {
      const quest: DailyQuest = {
        ...questWithTarget(50),
        progressValue: 50,
        status: "IN_PROGRESS",
      };
      const first = completeQuest(quest, NOON);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const second = completeQuest(first.value.quest, NOON);
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.error).toEqual({ reason: "ALREADY_COMPLETED" });
    });

    it("odbija zavrsetak posle isteka roka", () => {
      const quest: DailyQuest = {
        ...questWithTarget(50),
        progressValue: 50,
        status: "IN_PROGRESS",
      };
      const result = completeQuest(quest, AFTER_EXPIRY);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual({ reason: "EXPIRED" });
    });
  });

  describe("expireQuest", () => {
    it("odbija isticanje pre roka", () => {
      const quest = questWithTarget(50);
      const result = expireQuest(quest, NOON);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.reason).toBe("NOT_YET_EXPIRABLE");
    });

    it("istice quest posle roka", () => {
      const quest = questWithTarget(50);
      const result = expireQuest(quest, AFTER_EXPIRY);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("EXPIRED");
    });

    it("je idempotentno na vec-EXPIRED questu (bezbedno za ponovljeni cron)", () => {
      const quest: DailyQuest = { ...questWithTarget(50), status: "EXPIRED" };
      const result = expireQuest(quest, AFTER_EXPIRY);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual(quest);
    });

    it("odbija isticanje vec zavrsenog questa", () => {
      const quest: DailyQuest = { ...questWithTarget(50), status: "COMPLETED", progressValue: 50 };
      const result = expireQuest(quest, AFTER_EXPIRY);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual({ reason: "ALREADY_COMPLETED" });
    });
  });

  describe("hasExpired", () => {
    it("false pre roka, true posle roka", () => {
      const quest = questWithTarget(50);
      expect(hasExpired(quest, NOON)).toBe(false);
      expect(hasExpired(quest, AFTER_EXPIRY)).toBe(true);
    });
  });
});
