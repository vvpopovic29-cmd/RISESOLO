import { calculateCurrentLevelXP, calculateLevel, calculateProgress, calculateRequiredXP, detectLevelUp } from "./xp";

describe("calculateRequiredXP", () => {
  it("racuna XP potreban po formuli level^2 * 100", () => {
    expect(calculateRequiredXP(1)).toBe(100);
    expect(calculateRequiredXP(2)).toBe(400);
    expect(calculateRequiredXP(3)).toBe(900);
    expect(calculateRequiredXP(10)).toBe(10_000);
  });

  it("baca gresku za nevalidan level", () => {
    expect(() => calculateRequiredXP(0)).toThrow(RangeError);
    expect(() => calculateRequiredXP(-1)).toThrow(RangeError);
    expect(() => calculateRequiredXP(1.5)).toThrow(RangeError);
  });
});

describe("calculateLevel", () => {
  it("vraca level 1 za 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("ostaje na levelu 1 tik ispod granice", () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it("prelazi na level 2 tacno na granici (100 XP)", () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it("prelazi na level 3 tacno na kumulativnoj granici (100 + 400 = 500 XP)", () => {
    expect(calculateLevel(499)).toBe(2);
    expect(calculateLevel(500)).toBe(3);
  });

  it("podrzava vise uzastopnih level-up granica", () => {
    // level1->2: 100, level2->3: 400 (cum 500), level3->4: 900 (cum 1400)
    expect(calculateLevel(1399)).toBe(3);
    expect(calculateLevel(1400)).toBe(4);
  });

  it("baca gresku za negativan XP", () => {
    expect(() => calculateLevel(-1)).toThrow(RangeError);
  });
});

describe("calculateCurrentLevelXP", () => {
  it("vraca XP unutar trenutnog levela, ne kumulativni total", () => {
    expect(calculateCurrentLevelXP(0)).toBe(0);
    expect(calculateCurrentLevelXP(99)).toBe(99);
    expect(calculateCurrentLevelXP(100)).toBe(0);
    expect(calculateCurrentLevelXP(150)).toBe(50);
    expect(calculateCurrentLevelXP(500)).toBe(0);
    expect(calculateCurrentLevelXP(900)).toBe(400);
  });
});

describe("calculateProgress", () => {
  it("vraca 0 na pocetku levela i priblizava se 1 pred kraj", () => {
    expect(calculateProgress(0)).toBe(0);
    expect(calculateProgress(50)).toBeCloseTo(0.5);
    expect(calculateProgress(99)).toBeCloseTo(0.99);
  });
});

describe("detectLevelUp", () => {
  it("prijavljuje da nije bilo level-upa kad XP ne predje granicu", () => {
    const result = detectLevelUp(0, 50);
    expect(result.leveledUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(1);
  });

  it("prijavljuje jedan level-up kad se predje granica", () => {
    const result = detectLevelUp(50, 100);
    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(2);
    expect(result.levelsGained).toBe(1);
  });

  it("prijavljuje visestruki level-up ako XP nagrada preskoci vise granica odjednom", () => {
    const result = detectLevelUp(0, 1400);
    expect(result.leveledUp).toBe(true);
    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(4);
    expect(result.levelsGained).toBe(3);
  });

  it("ignorise negativnu/nula xpGained vrednost umesto da baci gresku", () => {
    const result = detectLevelUp(50, -10);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBe(1);
  });
});
