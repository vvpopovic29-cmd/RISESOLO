import { WORKSHOP_ITEMS, canCraftWorkshopItem, getWorkshopItem } from "./workshop-item";

describe("WORKSHOP_ITEMS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = WORKSHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getWorkshopItem", () => {
  it("vraca definiciju za poznat id", () => {
    expect(getWorkshopItem("IRON_TALISMAN")).toMatchObject({ levelRequirement: 3, coinCost: 200 });
  });

  it("vraca undefined za nepoznat id", () => {
    expect(getWorkshopItem("NEPOSTOJECI")).toBeUndefined();
  });
});

describe("canCraftWorkshopItem", () => {
  const definition = { levelRequirement: 5, coinCost: 300 };

  it("dozvoljava izradu kada su nivo i coins dovoljni i predmet nije u vlasnistvu", () => {
    expect(canCraftWorkshopItem(5, 300, definition, false)).toBe(true);
    expect(canCraftWorkshopItem(10, 1000, definition, false)).toBe(true);
  });

  it("odbija izradu ispod potrebnog nivoa, cak i sa dovoljno coins-a", () => {
    expect(canCraftWorkshopItem(4, 1000, definition, false)).toBe(false);
  });

  it("odbija izradu bez dovoljno coins-a, cak i sa dovoljnim nivoom", () => {
    expect(canCraftWorkshopItem(10, 299, definition, false)).toBe(false);
  });

  it("odbija izradu ako je predmet vec u vlasnistvu", () => {
    expect(canCraftWorkshopItem(10, 1000, definition, true)).toBe(false);
  });
});
