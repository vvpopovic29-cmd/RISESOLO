import { DAILY_QUEST_KINDS, selectDailyQuestKind } from "./daily-quest-pool";

describe("selectDailyQuestKind", () => {
  it("uvek vraca clan DAILY_QUEST_KINDS", () => {
    for (let i = 0; i < 20; i += 1) {
      const kind = selectDailyQuestKind(`user-${i}`, new Date(2026, 0, 1 + i));
      expect(DAILY_QUEST_KINDS).toContain(kind);
    }
  });

  it("deterministicki - isti (userId, datum) uvek daje isti kind", () => {
    const date = new Date(2026, 5, 15);
    const first = selectDailyQuestKind("stable-user", date);
    const second = selectDailyQuestKind("stable-user", new Date(2026, 5, 15));
    expect(second).toBe(first);
  });

  it("razliciti korisnici istog dana mogu dobiti razlicite kind-ove (varijetet)", () => {
    const date = new Date(2026, 2, 10);
    const kinds = new Set(Array.from({ length: 30 }, (_, i) => selectDailyQuestKind(`varied-user-${i}`, date)));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("isti korisnik razlicitih dana moze dobiti razlicite kind-ove (rotacija)", () => {
    const userId = "rotating-user";
    const kinds = new Set(Array.from({ length: 30 }, (_, i) => selectDailyQuestKind(userId, new Date(2026, 0, 1 + i))));
    expect(kinds.size).toBeGreaterThan(1);
  });
});
