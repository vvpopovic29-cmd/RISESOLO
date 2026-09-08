import { assertNever } from "./assert-never";

describe("assertNever", () => {
  it("baca gresku sa porukom kada se pozove (dostignuto samo pri buggy stanju)", () => {
    // @ts-expect-error - namerno prosledjujemo nevalidnu vrednost da testiramo runtime ponasanje
    expect(() => assertNever("neocekivano")).toThrow(/Neocekivana vrednost/);
  });

  it("koristi prilagodjenu poruku kada je prosledjena", () => {
    // @ts-expect-error - namerno prosledjujemo nevalidnu vrednost da testiramo runtime ponasanje
    expect(() => assertNever("x", "Nepoznat status")).toThrow(/Nepoznat status/);
  });
});
