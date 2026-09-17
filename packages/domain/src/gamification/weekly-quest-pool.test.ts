import { WEEKLY_QUEST_KINDS, isWeeklyQuestComplete, selectWeeklyQuestKind } from "./weekly-quest-pool";

describe("selectWeeklyQuestKind", () => {
  it("uvek vraca clan WEEKLY_QUEST_KINDS", () => {
    for (let i = 0; i < 20; i += 1) {
      const kind = selectWeeklyQuestKind(`user-${i}`, new Date(2026, 0, 1 + i * 7));
      expect(WEEKLY_QUEST_KINDS).toContain(kind);
    }
  });

  it("deterministicki - isti (userId, nedelja) uvek daje isti kind", () => {
    const weekStart = new Date(2026, 5, 15);
    const first = selectWeeklyQuestKind("stable-user", weekStart);
    const second = selectWeeklyQuestKind("stable-user", new Date(2026, 5, 15));
    expect(second).toBe(first);
  });

  it("razliciti korisnici iste nedelje mogu dobiti razlicite kind-ove (varijetet)", () => {
    const weekStart = new Date(2026, 2, 9);
    const kinds = new Set(Array.from({ length: 30 }, (_, i) => selectWeeklyQuestKind(`varied-user-${i}`, weekStart)));
    expect(kinds.size).toBeGreaterThan(1);
  });
});

describe("isWeeklyQuestComplete", () => {
  it("nije zavrsen dok progres ne dostigne cilj", () => {
    expect(isWeeklyQuestComplete(0, 800)).toBe(false);
    expect(isWeeklyQuestComplete(799, 800)).toBe(false);
  });

  it("zavrsen je kada progres dostigne ili predje cilj", () => {
    expect(isWeeklyQuestComplete(800, 800)).toBe(true);
    expect(isWeeklyQuestComplete(1200, 800)).toBe(true);
  });
});
