import { computeStreakAfterCompletion, isStreakActive } from "./streak";

describe("computeStreakAfterCompletion", () => {
  it("pocinje streak na 1 za prvi ikad zavrsetak", () => {
    expect(computeStreakAfterCompletion(0, null)).toBe(1);
  });

  it("ne duplira streak ako je vec zavrseno danas", () => {
    expect(computeStreakAfterCompletion(4, 0)).toBe(4);
  });

  it("povecava streak za 1 kada je poslednji zavrsetak bio juce", () => {
    expect(computeStreakAfterCompletion(4, 1)).toBe(5);
  });

  it("lomi streak na 1 kada je propusten bar jedan ceo dan", () => {
    expect(computeStreakAfterCompletion(4, 2)).toBe(1);
    expect(computeStreakAfterCompletion(10, 30)).toBe(1);
  });
});

describe("isStreakActive", () => {
  it("aktivan ako je zavrseno danas ili juce", () => {
    expect(isStreakActive(0)).toBe(true);
    expect(isStreakActive(1)).toBe(true);
  });

  it("neaktivan ako nikad nije zavrseno ili je propusten dan", () => {
    expect(isStreakActive(null)).toBe(false);
    expect(isStreakActive(2)).toBe(false);
  });
});
