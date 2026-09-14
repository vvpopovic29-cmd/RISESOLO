import {
  applyXpGain,
  calculateCurrentLevelXp,
  calculateLevel,
  calculateProgress,
  calculateRequiredXp,
  calculateTotalXpForLevel,
} from "./xp";

describe("XP/Level pravila", () => {
  it("calculateRequiredXp prati formulu Level^2 * 100", () => {
    expect(calculateRequiredXp(1)).toBe(100);
    expect(calculateRequiredXp(2)).toBe(400);
    expect(calculateRequiredXp(3)).toBe(900);
    expect(calculateRequiredXp(10)).toBe(10_000);
  });

  it("calculateTotalXpForLevel je kumulativni zbir pragova prethodnih nivoa", () => {
    expect(calculateTotalXpForLevel(1)).toBe(0);
    expect(calculateTotalXpForLevel(2)).toBe(100);
    expect(calculateTotalXpForLevel(3)).toBe(500);
    expect(calculateTotalXpForLevel(4)).toBe(1400);
  });

  it("calculateLevel vraca 1 za 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [101, 2],
    [499, 2],
    [500, 3],
    [900, 3],
    [1399, 3],
    [1400, 4],
  ])("calculateLevel(%i) === %i (granice nivoa)", (totalXp, expectedLevel) => {
    expect(calculateLevel(totalXp)).toBe(expectedLevel);
  });

  it("calculateCurrentLevelXp je uvek manji od requiredXp za taj nivo", () => {
    for (const totalXp of [0, 50, 99, 100, 250, 499, 500, 900, 1399, 1400]) {
      const level = calculateLevel(totalXp);
      const currentLevelXp = calculateCurrentLevelXp(totalXp);
      expect(currentLevelXp).toBeGreaterThanOrEqual(0);
      expect(currentLevelXp).toBeLessThan(calculateRequiredXp(level));
    }
  });

  it("calculateProgress vraca konzistentan snapshot", () => {
    const progress = calculateProgress(250);
    expect(progress.level).toBe(2);
    expect(progress.currentLevelXp).toBe(150);
    expect(progress.requiredXp).toBe(400);
    expect(progress.progressRatio).toBeCloseTo(150 / 400);
  });

  it("calculateLevel baca gresku za negativan ili necio XP", () => {
    expect(() => calculateLevel(-1)).toThrow(RangeError);
    expect(() => calculateLevel(1.5)).toThrow(RangeError);
  });

  describe("applyXpGain", () => {
    it("prijavljuje level up kada se predje prag", () => {
      const result = applyXpGain(90, 20); // 90 -> 110, level 1 -> 2
      expect(result.previousLevel).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(result.levelsGained).toBe(1);
      expect(result.newTotalXp).toBe(110);
    });

    it("ne prijavljuje level up kada se ne predje prag", () => {
      const result = applyXpGain(0, 50);
      expect(result.leveledUp).toBe(false);
      expect(result.levelsGained).toBe(0);
      expect(result.newLevel).toBe(1);
    });

    it("podrzava preskakanje vise nivoa odjednom (veliki XP dobitak)", () => {
      const result = applyXpGain(0, 1400); // direktno na level 4
      expect(result.newLevel).toBe(4);
      expect(result.levelsGained).toBe(3);
    });

    it("je cista funkcija - isti ulaz uvek daje isti izlaz (bezbedno za ponovnu primenu istog XP eventa)", () => {
      const first = applyXpGain(300, 150);
      const second = applyXpGain(300, 150);
      expect(first).toEqual(second);
    });
  });
});
