import { GUILD_XP_CONTRIBUTION_RATE, calculateGuildXpContribution } from "./contribution";

describe("calculateGuildXpContribution", () => {
  it("racuna fiksni procenat dobijenog XP-a", () => {
    expect(calculateGuildXpContribution(100)).toBe(Math.floor(100 * GUILD_XP_CONTRIBUTION_RATE));
    expect(calculateGuildXpContribution(250)).toBe(50);
  });

  it("zaokruzuje na dole (bez frakcionih coins/xp)", () => {
    expect(calculateGuildXpContribution(15)).toBe(3);
  });

  it("vraca 0 za nulti ili negativan XP", () => {
    expect(calculateGuildXpContribution(0)).toBe(0);
    expect(calculateGuildXpContribution(-50)).toBe(0);
  });
});
