import { BASE_PLAYER_STATS, allocateStatPoints, statPointsForLevelsGained } from "./stats";

describe("statPointsForLevelsGained", () => {
  it("mnozi broj levela sa STAT_POINTS_PER_LEVEL", () => {
    expect(statPointsForLevelsGained(0)).toBe(0);
    expect(statPointsForLevelsGained(1)).toBe(3);
    expect(statPointsForLevelsGained(3)).toBe(9);
  });

  it("baca gresku za negativan broj levela", () => {
    expect(() => statPointsForLevelsGained(-1)).toThrow(RangeError);
  });
});

describe("allocateStatPoints", () => {
  it("uspesno raspodeljuje poene kada ima dovoljno na raspolaganju", () => {
    const result = allocateStatPoints(BASE_PLAYER_STATS, 3, { strength: 2, agility: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stats.strength).toBe(3);
      expect(result.value.stats.agility).toBe(2);
      expect(result.value.stats.endurance).toBe(1);
      expect(result.value.remainingPoints).toBe(0);
    }
  });

  it("dozvoljava delimicnu potrosnju poena", () => {
    const result = allocateStatPoints(BASE_PLAYER_STATS, 5, { vitality: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.remainingPoints).toBe(3);
    }
  });

  it("odbija raspodelu koja prelazi dostupne poene (sprecava besplatne statove)", () => {
    const result = allocateStatPoints(BASE_PLAYER_STATS, 2, { strength: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "INSUFFICIENT_POINTS", requested: 3, available: 2 });
    }
  });

  it("odbija negativnu raspodelu", () => {
    const result = allocateStatPoints(BASE_PLAYER_STATS, 5, { strength: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "NEGATIVE_ALLOCATION", stat: "strength" });
    }
  });

  it("odbija ne-celobrojnu raspodelu", () => {
    const result = allocateStatPoints(BASE_PLAYER_STATS, 5, { strength: 1.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "NON_INTEGER_ALLOCATION", stat: "strength" });
    }
  });

  it("ne mutira originalni stats objekat", () => {
    const original = { ...BASE_PLAYER_STATS };
    allocateStatPoints(BASE_PLAYER_STATS, 3, { strength: 2 });
    expect(BASE_PLAYER_STATS).toEqual(original);
  });
});
