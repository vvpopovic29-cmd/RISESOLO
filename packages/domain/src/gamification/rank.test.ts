import { getNextRank, meetsRankExamLevelRequirement, RANK_ORDER } from "./rank";

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
