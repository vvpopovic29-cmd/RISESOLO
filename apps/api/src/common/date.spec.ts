import { startOfIsoWeek } from "./date";

describe("startOfIsoWeek", () => {
  it("vraca isti ponedeljak za sve dane te nedelje", () => {
    const monday = startOfIsoWeek(new Date("2026-09-14T00:00:00.000Z")); // ponedeljak
    const wednesday = startOfIsoWeek(new Date("2026-09-16T15:30:00.000Z"));
    const sunday = startOfIsoWeek(new Date("2026-09-20T23:59:59.000Z"));

    expect(monday.toISOString()).toBe("2026-09-14T00:00:00.000Z");
    expect(wednesday.toISOString()).toBe("2026-09-14T00:00:00.000Z");
    expect(sunday.toISOString()).toBe("2026-09-14T00:00:00.000Z");
  });

  it("naredna nedelja pocinje sedam dana kasnije", () => {
    const thisWeek = startOfIsoWeek(new Date("2026-09-16T00:00:00.000Z"));
    const nextWeek = startOfIsoWeek(new Date("2026-09-23T00:00:00.000Z"));

    expect(nextWeek.getTime() - thisWeek.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
