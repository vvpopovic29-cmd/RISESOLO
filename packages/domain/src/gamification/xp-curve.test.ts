import {
  levelFromTotalXp,
  totalXpForLevel,
  xpIntoCurrentLevel,
  xpRequiredForLevel,
} from "./xp-curve";

describe("xpRequiredForLevel", () => {
  it("raste linearno (+50 po nivou)", () => {
    expect(xpRequiredForLevel(1)).toBe(100);
    expect(xpRequiredForLevel(2)).toBe(150);
    expect(xpRequiredForLevel(3)).toBe(200);
  });
});

describe("totalXpForLevel", () => {
  it("nivo 1 zahteva 0 kumulativnog XP-a", () => {
    expect(totalXpForLevel(1)).toBe(0);
  });

  it("kumulira xpRequiredForLevel prethodnih nivoa", () => {
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(250);
    expect(totalXpForLevel(4)).toBe(450);
  });
});

describe("levelFromTotalXp", () => {
  it("0 XP je nivo 1", () => {
    expect(levelFromTotalXp(0)).toBe(1);
  });

  it("XP tacno na granici prelazi na sledeci nivo", () => {
    expect(levelFromTotalXp(99)).toBe(1);
    expect(levelFromTotalXp(100)).toBe(2);
    expect(levelFromTotalXp(249)).toBe(2);
    expect(levelFromTotalXp(250)).toBe(3);
  });

  it("je inverzna funkcija totalXpForLevel na granicama nivoa", () => {
    for (let level = 1; level <= 20; level += 1) {
      expect(levelFromTotalXp(totalXpForLevel(level))).toBe(level);
    }
  });
});

describe("xpIntoCurrentLevel", () => {
  it("vraca progres unutar trenutnog nivoa", () => {
    expect(xpIntoCurrentLevel(0)).toBe(0);
    expect(xpIntoCurrentLevel(50)).toBe(50);
    expect(xpIntoCurrentLevel(100)).toBe(0);
    expect(xpIntoCurrentLevel(120)).toBe(20);
  });
});
