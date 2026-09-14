import {
  allocateStatPoints,
  calculateStatPointsAwarded,
  createInitialStats,
  grantStatPoints,
  STARTING_STAT_VALUE,
  totalAllocatedStats,
} from "./stats";

describe("Stat pravila", () => {
  it("createInitialStats postavlja svih 5 statova na pocetnu vrednost, bez nerasporedjenih poena", () => {
    const stats = createInitialStats();
    expect(stats.strength).toBe(STARTING_STAT_VALUE);
    expect(stats.agility).toBe(STARTING_STAT_VALUE);
    expect(stats.endurance).toBe(STARTING_STAT_VALUE);
    expect(stats.vitality).toBe(STARTING_STAT_VALUE);
    expect(stats.intelligence).toBe(STARTING_STAT_VALUE);
    expect(stats.unspentPoints).toBe(0);
  });

  it("calculateStatPointsAwarded skalira sa brojem predjenih nivoa (podrzava vise nivoa odjednom)", () => {
    expect(calculateStatPointsAwarded(1, 2)).toBe(3);
    expect(calculateStatPointsAwarded(1, 4)).toBe(9);
    expect(calculateStatPointsAwarded(5, 5)).toBe(0);
  });

  it("calculateStatPointsAwarded baca gresku ako je newLevel < previousLevel", () => {
    expect(() => calculateStatPointsAwarded(5, 4)).toThrow(RangeError);
  });

  it("grantStatPoints dodaje u unspentPoints bez automatske raspodele", () => {
    const stats = grantStatPoints(createInitialStats(), 3);
    expect(stats.unspentPoints).toBe(3);
    expect(stats.strength).toBe(STARTING_STAT_VALUE);
  });

  describe("allocateStatPoints", () => {
    it("uspesno rasporedjuje poene na izabrani stat i oduzima unspentPoints", () => {
      const stats = grantStatPoints(createInitialStats(), 3);
      const result = allocateStatPoints(stats, "STRENGTH", 2);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.strength).toBe(STARTING_STAT_VALUE + 2);
        expect(result.value.unspentPoints).toBe(1);
      }
    });

    it("odbija raspodelu vecu od dostupnih poena (sprecava duplu/preveliku potrosnju)", () => {
      const stats = grantStatPoints(createInitialStats(), 2);
      const result = allocateStatPoints(stats, "AGILITY", 5);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ reason: "INSUFFICIENT_POINTS", requested: 5, available: 2 });
      }
    });

    it("odbija amount <= 0 ili necio broj", () => {
      const stats = grantStatPoints(createInitialStats(), 3);
      expect(allocateStatPoints(stats, "VITALITY", 0).ok).toBe(false);
      expect(allocateStatPoints(stats, "VITALITY", -1).ok).toBe(false);
      expect(allocateStatPoints(stats, "VITALITY", 1.5).ok).toBe(false);
    });

    it("ne mutira originalni stats objekat (imutabilnost)", () => {
      const stats = grantStatPoints(createInitialStats(), 3);
      allocateStatPoints(stats, "INTELLIGENCE", 2);
      expect(stats.intelligence).toBe(STARTING_STAT_VALUE);
      expect(stats.unspentPoints).toBe(3);
    });
  });

  it("totalAllocatedStats sabira svih 5 statova bez unspentPoints", () => {
    const stats = createInitialStats();
    expect(totalAllocatedStats(stats)).toBe(STARTING_STAT_VALUE * 5);
  });
});
