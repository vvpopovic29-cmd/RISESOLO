import { isGuildRaidComplete } from "./raid";

describe("isGuildRaidComplete", () => {
  it("nije zavrsen dok zbir doprinosa ne dostigne cilj", () => {
    expect(isGuildRaidComplete(0, 20)).toBe(false);
    expect(isGuildRaidComplete(19, 20)).toBe(false);
  });

  it("zavrsen je kada zbir doprinosa dostigne ili predje cilj", () => {
    expect(isGuildRaidComplete(20, 20)).toBe(true);
    expect(isGuildRaidComplete(25, 20)).toBe(true);
  });
});
