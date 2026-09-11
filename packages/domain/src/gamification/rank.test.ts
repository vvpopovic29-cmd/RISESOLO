import {
  getNextRank,
  isRankExamOnCooldown,
  meetsRankExamLevelRequirement,
  rankExamCooldownRemainingHours,
  RANK_ORDER,
} from "./rank";

describe("getNextRank", () => {
  it("vraca sledeci rank u nizu za svaki rank osim poslednjeg", () => {
    expect(getNextRank("E")).toBe("D");
    expect(getNextRank("D")).toBe("C");
    expect(getNextRank("C")).toBe("B");
    expect(getNextRank("B")).toBe("A");
    expect(getNextRank("A")).toBe("S");
    expect(getNextRank("S")).toBe("SS");
    expect(getNextRank("SS")).toBe("SSS");
  });

  it("vraca null za najvisi rang (SSS)", () => {
    expect(getNextRank("SSS")).toBeNull();
  });

  it("RANK_ORDER je rastuci niz svih 8 rangova", () => {
    expect(RANK_ORDER).toEqual(["E", "D", "C", "B", "A", "S", "SS", "SSS"]);
  });
});

describe("meetsRankExamLevelRequirement", () => {
  it("vraca true kada je level dovoljan za ciljni rank", () => {
    expect(meetsRankExamLevelRequirement(5, "D")).toBe(true);
    expect(meetsRankExamLevelRequirement(10, "D")).toBe(true);
  });

  it("vraca false kada je level nedovoljan za ciljni rank", () => {
    expect(meetsRankExamLevelRequirement(4, "D")).toBe(false);
    expect(meetsRankExamLevelRequirement(1, "SSS")).toBe(false);
  });

  it("E rank zahteva samo Level 1 (dostupan od pocetka)", () => {
    expect(meetsRankExamLevelRequirement(1, "E")).toBe(true);
  });
});

describe("isRankExamOnCooldown", () => {
  it("vraca true odmah posle isteka (unutar 24h prozora)", () => {
    const failedAt = new Date("2026-01-01T10:00:00.000Z");
    const now = new Date("2026-01-01T10:00:01.000Z");
    expect(isRankExamOnCooldown(failedAt, now)).toBe(true);
  });

  it("vraca true tik pre isteka cooldown-a", () => {
    const failedAt = new Date("2026-01-01T10:00:00.000Z");
    const now = new Date("2026-01-02T09:59:59.999Z");
    expect(isRankExamOnCooldown(failedAt, now)).toBe(true);
  });

  it("vraca false tacno na 24h i posle", () => {
    const failedAt = new Date("2026-01-01T10:00:00.000Z");
    expect(isRankExamOnCooldown(failedAt, new Date("2026-01-02T10:00:00.000Z"))).toBe(false);
    expect(isRankExamOnCooldown(failedAt, new Date("2026-01-03T10:00:00.000Z"))).toBe(false);
  });
});

describe("rankExamCooldownRemainingHours", () => {
  it("zaokruzuje na gore i nikad ne vraca manje od 1", () => {
    const failedAt = new Date("2026-01-01T10:00:00.000Z");
    expect(rankExamCooldownRemainingHours(failedAt, new Date("2026-01-01T10:00:01.000Z"))).toBe(24);
    expect(rankExamCooldownRemainingHours(failedAt, new Date("2026-01-02T09:59:59.999Z"))).toBe(1);
  });
});
