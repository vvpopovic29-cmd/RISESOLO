import { applyXpGain, xpToNextLevel, STAT_POINTS_PER_LEVEL } from "./level";

describe("applyXpGain", () => {
  it("akumulira XP bez level-up-a kada je ispod praga sledeceg nivoa", () => {
    const result = applyXpGain({ level: 1, xp: 0 }, 50);
    expect(result).toEqual({ level: 1, xp: 50, levelsGained: 0, statPointsGained: 0 });
  });

  it("leveluje jednom kada XP dostigne prag i prenosi visak u novi nivo", () => {
    const result = applyXpGain({ level: 1, xp: 90 }, 20); // 90 + 20 = 110 >= 100
    expect(result.level).toBe(2);
    expect(result.xp).toBe(10);
    expect(result.levelsGained).toBe(1);
    expect(result.statPointsGained).toBe(STAT_POINTS_PER_LEVEL);
  });

  it("leveluje vise puta u jednom pozivu za veliki XP grant (npr. Boss Quest)", () => {
    // level 1->2 treba 100 XP, 2->3 treba 400 XP, ostaje 50 XP na nivou 3.
    const result = applyXpGain({ level: 1, xp: 0 }, 100 + 400 + 50);
    expect(result.level).toBe(3);
    expect(result.xp).toBe(50);
    expect(result.levelsGained).toBe(2);
    expect(result.statPointsGained).toBe(2 * STAT_POINTS_PER_LEVEL);
  });

  it("tacno pogadja prag (xp jednak pragu i dalje leveluje)", () => {
    const result = applyXpGain({ level: 1, xp: 0 }, 100);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(0);
    expect(result.levelsGained).toBe(1);
  });

  it("baca gresku za nevalidan xpGained", () => {
    expect(() => applyXpGain({ level: 1, xp: 0 }, 0)).toThrow(RangeError);
    expect(() => applyXpGain({ level: 1, xp: 0 }, -10)).toThrow(RangeError);
    expect(() => applyXpGain({ level: 1, xp: 0 }, 1.5)).toThrow(RangeError);
  });
});

describe("xpToNextLevel", () => {
  it("racuna preostali XP do sledeceg nivoa", () => {
    expect(xpToNextLevel({ level: 1, xp: 30 })).toBe(70);
    expect(xpToNextLevel({ level: 5, xp: 0 })).toBe(2500);
  });
});
