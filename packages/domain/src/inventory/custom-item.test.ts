import { CUSTOM_ITEM_COIN_COST, CUSTOM_ITEM_MAX_COUNT, canCreateCustomItem } from "./custom-item";

describe("canCreateCustomItem", () => {
  it("dozvoljava kreiranje kada su coins dovoljni i ima slobodnih slotova", () => {
    expect(canCreateCustomItem(CUSTOM_ITEM_COIN_COST, 0)).toBe(true);
    expect(canCreateCustomItem(CUSTOM_ITEM_COIN_COST * 10, CUSTOM_ITEM_MAX_COUNT - 1)).toBe(true);
  });

  it("odbija kreiranje bez dovoljno coins-a, cak i sa slobodnim slotovima", () => {
    expect(canCreateCustomItem(CUSTOM_ITEM_COIN_COST - 1, 0)).toBe(false);
  });

  it("odbija kreiranje kada je dostignut maksimalan broj slotova, cak i sa dovoljno coins-a", () => {
    expect(canCreateCustomItem(CUSTOM_ITEM_COIN_COST * 10, CUSTOM_ITEM_MAX_COUNT)).toBe(false);
    expect(canCreateCustomItem(CUSTOM_ITEM_COIN_COST * 10, CUSTOM_ITEM_MAX_COUNT + 1)).toBe(false);
  });
});
