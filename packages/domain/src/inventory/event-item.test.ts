import { EVENT_ITEMS, canClaimEventItem, getEventItem, isEventActive } from "./event-item";

describe("EVENT_ITEMS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = EVENT_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getEventItem", () => {
  it("vraca definiciju za poznat id", () => {
    expect(getEventItem("SUMMER_SHRED")).toMatchObject({ start: { month: 6, day: 1 }, end: { month: 6, day: 30 } });
  });

  it("vraca undefined za nepoznat id", () => {
    expect(getEventItem("NEPOSTOJECI")).toBeUndefined();
  });
});

describe("isEventActive", () => {
  const definition = { start: { month: 6, day: 1 }, end: { month: 6, day: 30 } };

  it("aktivan na pocetku prozora (inclusive)", () => {
    expect(isEventActive(definition, new Date("2026-06-01T00:00:00.000Z"))).toBe(true);
  });

  it("aktivan na kraju prozora (inclusive)", () => {
    expect(isEventActive(definition, new Date("2026-06-30T23:59:59.000Z"))).toBe(true);
  });

  it("aktivan negde u sredini prozora", () => {
    expect(isEventActive(definition, new Date("2026-06-15T12:00:00.000Z"))).toBe(true);
  });

  it("neaktivan dan pre pocetka prozora", () => {
    expect(isEventActive(definition, new Date("2026-05-31T23:59:59.000Z"))).toBe(false);
  });

  it("neaktivan dan posle kraja prozora", () => {
    expect(isEventActive(definition, new Date("2026-07-01T00:00:00.000Z"))).toBe(false);
  });

  it("neaktivan u potpuno drugom mesecu", () => {
    expect(isEventActive(definition, new Date("2026-12-15T00:00:00.000Z"))).toBe(false);
  });

  it("godina se ne uzima u obzir - ponavlja se svake godine", () => {
    expect(isEventActive(definition, new Date("2030-06-15T00:00:00.000Z"))).toBe(true);
    expect(isEventActive(definition, new Date("2020-06-15T00:00:00.000Z"))).toBe(true);
  });
});

describe("canClaimEventItem", () => {
  const definition = { start: { month: 9, day: 1 }, end: { month: 9, day: 30 } };
  const duringWindow = new Date("2026-09-18T00:00:00.000Z");
  const outsideWindow = new Date("2026-10-01T00:00:00.000Z");

  it("dozvoljava prisvajanje unutar prozora ako predmet nije u vlasnistvu", () => {
    expect(canClaimEventItem(definition, duringWindow, false)).toBe(true);
  });

  it("odbija prisvajanje van prozora, cak i ako predmet nije u vlasnistvu", () => {
    expect(canClaimEventItem(definition, outsideWindow, false)).toBe(false);
  });

  it("odbija prisvajanje ako je predmet vec u vlasnistvu, cak i unutar prozora", () => {
    expect(canClaimEventItem(definition, duringWindow, true)).toBe(false);
  });
});
