import { calculateCoinsForXp, COINS_PER_XP } from "./coins";

describe("calculateCoinsForXp", () => {
  it("racuna coins po fiksnom odnosu COINS_PER_XP (zaokruzeno na dole)", () => {
    expect(calculateCoinsForXp(0)).toBe(0);
    expect(calculateCoinsForXp(COINS_PER_XP - 1)).toBe(0);
    expect(calculateCoinsForXp(COINS_PER_XP)).toBe(1);
    expect(calculateCoinsForXp(COINS_PER_XP * 3 + 2)).toBe(3);
  });

  it("baca gresku za negativan ili necio XP", () => {
    expect(() => calculateCoinsForXp(-1)).toThrow(RangeError);
    expect(() => calculateCoinsForXp(1.5)).toThrow(RangeError);
  });
});
