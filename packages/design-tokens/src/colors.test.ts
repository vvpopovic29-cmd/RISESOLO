import { colors, semantic, semanticColorPurpose } from "./colors";

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe("design tokens - pravilo #9 (rezervisane boje)", () => {
  it("semanticke boje imaju tacno jednu definisanu namenu, bez viska ili manjka", () => {
    expect(Object.keys(semantic).sort()).toEqual(Object.keys(semanticColorPurpose).sort());
  });

  it("colors izlaze samo poznate, namerne grupe (neutral, semantic, dark, light)", () => {
    expect(Object.keys(colors).sort()).toEqual(["dark", "light", "neutral", "semantic"].sort());
  });

  it("svaka semanticka boja ima subtle/DEFAULT/strong varijantu u validnom hex formatu", () => {
    for (const [name, shades] of Object.entries(semantic)) {
      expect(shades).toHaveProperty("subtle");
      expect(shades).toHaveProperty("DEFAULT");
      expect(shades).toHaveProperty("strong");
      for (const hex of Object.values(shades)) {
        expect(hex).toMatch(HEX_PATTERN);
      }
      expect(semanticColorPurpose).toHaveProperty(name);
    }
  });

  it("dark i light teme koriste iskljucivo neutralnu skalu za pozadinu/tekst/ivice", () => {
    const neutralHexValues = new Set(Object.values(colors.neutral));
    for (const themeColors of [colors.dark, colors.light]) {
      for (const hex of Object.values(themeColors)) {
        expect(neutralHexValues.has(hex)).toBe(true);
      }
    }
  });
});
