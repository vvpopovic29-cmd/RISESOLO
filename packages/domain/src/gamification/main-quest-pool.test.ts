import { STAT_KEYS } from "./stats";
import { isMainQuestComplete, mainQuestTarget, mainQuestTier, selectMainQuestKind } from "./main-quest-pool";

describe("selectMainQuestKind", () => {
  it("rotira kroz STAT_KEYS redom pocevsi od strength", () => {
    expect(selectMainQuestKind(0)).toBe("strength");
    expect(selectMainQuestKind(1)).toBe("agility");
    expect(selectMainQuestKind(2)).toBe("endurance");
    expect(selectMainQuestKind(3)).toBe("vitality");
    expect(selectMainQuestKind(4)).toBe("intelligence");
  });

  it("vraca se na strength posle pune rotacije (visi tier)", () => {
    expect(selectMainQuestKind(5)).toBe("strength");
    expect(selectMainQuestKind(6)).toBe("agility");
  });

  it("uvek vraca clan STAT_KEYS", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(STAT_KEYS).toContain(selectMainQuestKind(i));
    }
  });
});

describe("mainQuestTier", () => {
  it("tier 1 za prvih 5 (jedna puna rotacija)", () => {
    expect(mainQuestTier(0)).toBe(1);
    expect(mainQuestTier(4)).toBe(1);
  });

  it("tier 2 posle pune rotacije", () => {
    expect(mainQuestTier(5)).toBe(2);
    expect(mainQuestTier(9)).toBe(2);
  });

  it("tier 3 posle druge pune rotacije", () => {
    expect(mainQuestTier(10)).toBe(3);
  });
});

describe("mainQuestTarget", () => {
  it("raste linearno sa tier-om (korak 10)", () => {
    expect(mainQuestTarget(1)).toBe(10);
    expect(mainQuestTarget(2)).toBe(20);
    expect(mainQuestTarget(3)).toBe(30);
  });
});

describe("isMainQuestComplete", () => {
  it("nije zavrsen dok progres ne dostigne cilj", () => {
    expect(isMainQuestComplete(1, 10)).toBe(false);
    expect(isMainQuestComplete(9, 10)).toBe(false);
  });

  it("zavrsen je kada progres dostigne ili predje cilj", () => {
    expect(isMainQuestComplete(10, 10)).toBe(true);
    expect(isMainQuestComplete(15, 10)).toBe(true);
  });
});
