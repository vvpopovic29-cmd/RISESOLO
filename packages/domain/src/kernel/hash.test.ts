import { fnv1aHash, seededIndex } from "./hash";

describe("hash", () => {
  it("fnv1aHash je deterministicki - isti ulaz uvek daje isti izlaz", () => {
    expect(fnv1aHash("user-1:2026-09-14")).toBe(fnv1aHash("user-1:2026-09-14"));
  });

  it("fnv1aHash razlicito hesuje razlicite stringove (u praksi)", () => {
    expect(fnv1aHash("user-1:2026-09-14")).not.toBe(fnv1aHash("user-2:2026-09-14"));
    expect(fnv1aHash("user-1:2026-09-14")).not.toBe(fnv1aHash("user-1:2026-09-15"));
  });

  it("fnv1aHash uvek vraca nenegativan 32-bit ceo broj", () => {
    for (const input of ["", "a", "risesolo", "🔥"]) {
      const value = fnv1aHash(input);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(2 ** 32);
    }
  });

  it("seededIndex je uvek u opsegu [0, length)", () => {
    for (let i = 0; i < 20; i += 1) {
      const index = seededIndex(`seed-${i}`, 6);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(6);
    }
  });

  it("seededIndex baca gresku za length <= 0", () => {
    expect(() => seededIndex("seed", 0)).toThrow(RangeError);
    expect(() => seededIndex("seed", -1)).toThrow(RangeError);
  });
});
