import { SHOP_ITEMS, canPurchaseShopItem, getShopItem } from "./item";

describe("SHOP_ITEMS", () => {
  it("ima jedinstvene ID-jeve", () => {
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("svi predmeti imaju pozitivnu cenu", () => {
    expect(SHOP_ITEMS.every((item) => item.price > 0)).toBe(true);
  });
});

describe("getShopItem", () => {
  it("vraca definiciju za validan id", () => {
    expect(getShopItem("FRAME_BRONZE")).toEqual({ id: "FRAME_BRONZE", category: "AVATAR_FRAME", price: 100 });
  });

  it("vraca undefined za nepoznat id", () => {
    expect(getShopItem("DOES_NOT_EXIST")).toBeUndefined();
  });
});

describe("canPurchaseShopItem", () => {
  it("dozvoljava kupovinu kada ima dovoljno coins-a i predmet jos nije u vlasnistvu", () => {
    expect(canPurchaseShopItem(500, 300, false)).toBe(true);
  });

  it("odbija kupovinu kada nema dovoljno coins-a", () => {
    expect(canPurchaseShopItem(100, 300, false)).toBe(false);
  });

  it("odbija kupovinu predmeta koji je vec u vlasnistvu", () => {
    expect(canPurchaseShopItem(1000, 300, true)).toBe(false);
  });

  it("dozvoljava kupovinu kada coins tacno pokrivaju cenu", () => {
    expect(canPurchaseShopItem(300, 300, false)).toBe(true);
  });
});
