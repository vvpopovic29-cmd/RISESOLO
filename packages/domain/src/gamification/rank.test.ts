import { calculateRank } from "./rank";

describe("calculateRank", () => {
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
    [120, "S"],
  ] as const)("level %i -> rank %s", (level, expected) => {
    expect(calculateRank(level)).toBe(expected);
  });

  it("baca gresku za nevalidan level", () => {
    expect(() => calculateRank(0)).toThrow(RangeError);
    expect(() => calculateRank(-5)).toThrow(RangeError);
  });
});
