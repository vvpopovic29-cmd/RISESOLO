import { rankForLevel } from "./rank";

describe("rankForLevel", () => {
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
    [500, "S"],
  ] as const)("nivo %i -> rang %s", (level, expectedRank) => {
    expect(rankForLevel(level)).toBe(expectedRank);
  });
});
