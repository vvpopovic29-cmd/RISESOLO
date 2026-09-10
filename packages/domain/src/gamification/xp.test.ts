import { xpRequiredForLevel } from "./xp";

describe("xpRequiredForLevel", () => {
  it.each([
    [1, 100],
    [2, 400],
    [3, 900],
    [4, 1600],
    [5, 2500],
    [10, 10000],
    [20, 40000],
  ])("nivo %i zahteva %i XP za sledeci nivo", (level, expected) => {
    expect(xpRequiredForLevel(level)).toBe(expected);
  });

  it("baca gresku za nevalidan nivo", () => {
    expect(() => xpRequiredForLevel(0)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(-1)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(1.5)).toThrow(RangeError);
  });
});
