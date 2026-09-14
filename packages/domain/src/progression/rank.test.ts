import { calculateRank, minLevelForRank, nextRank } from "./rank";

describe("Rank pravila", () => {
  it.each([
    [1, "E"],
    [9, "E"],
    [10, "D"],
    [19, "D"],
    [20, "C"],
    [29, "C"],
    [30, "B"],
    [39, "B"],
    [40, "A"],
    [49, "A"],
    [50, "S"],
    [999, "S"],
  ] as const)("calculateRank(%i) === %s", (level, expectedRank) => {
    expect(calculateRank(level)).toBe(expectedRank);
  });

  it("baca gresku za nevalidan nivo", () => {
    expect(() => calculateRank(0)).toThrow(RangeError);
    expect(() => calculateRank(-5)).toThrow(RangeError);
  });

  it("minLevelForRank je inverzna funkcija granica", () => {
    expect(minLevelForRank("E")).toBe(1);
    expect(minLevelForRank("S")).toBe(50);
  });

  it("nextRank vraca sledeci rank, ili null za najvisi (S) u MVP-u", () => {
    expect(nextRank("E")).toBe("D");
    expect(nextRank("A")).toBe("S");
    expect(nextRank("S")).toBeNull();
  });
});
