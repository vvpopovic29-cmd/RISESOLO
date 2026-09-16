import { ForbiddenException, HttpException, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import { ShopService } from "./shop.service";

interface TxMocks {
  progression: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
  userCosmetic: { findUnique: jest.Mock; create: jest.Mock };
}

function makeTx(overrides: Partial<TxMocks> = {}): TxMocks {
  return {
    progression: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ userId: "user-1", coins: 1000 }),
      update: jest.fn().mockResolvedValue({ coins: 700 }),
      ...overrides.progression,
    },
    userCosmetic: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      ...overrides.userCosmetic,
    },
  };
}

function makePrisma(tx: TxMocks, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    $transaction: jest.fn().mockImplementation((callback: (tx: TxMocks) => unknown) => callback(tx)),
    userCosmetic: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    profile: {
      findUnique: jest.fn().mockResolvedValue({ equippedAvatarFrameId: null, equippedTitleId: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("ShopService", () => {
  describe("list", () => {
    it("baca 404 kada profil ne postoji", async () => {
      const prisma = makePrisma(makeTx(), { profile: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new ShopService(prisma);

      await expect(service.list("user-1")).rejects.toThrow(NotFoundException);
    });

    it("vraca ceo katalog sa owned/equipped flagovima", async () => {
      const prisma = makePrisma(makeTx(), {
        userCosmetic: { findMany: jest.fn().mockResolvedValue([{ itemId: "TITLE_NOVICE" }]) },
        profile: { findUnique: jest.fn().mockResolvedValue({ equippedAvatarFrameId: null, equippedTitleId: "TITLE_NOVICE" }) },
      });
      const service = new ShopService(prisma);

      const result = await service.list("user-1");

      const novice = result.find((item) => item.id === "TITLE_NOVICE");
      expect(novice).toMatchObject({ owned: true, equipped: true, category: "TITLE" });
      const bronze = result.find((item) => item.id === "FRAME_BRONZE");
      expect(bronze).toMatchObject({ owned: false, equipped: false, category: "AVATAR_FRAME", colorHex: "#CD7F32" });
    });
  });

  describe("purchase", () => {
    it("baca 404 za nepostojeci predmet", async () => {
      const prisma = makePrisma(makeTx());
      const service = new ShopService(prisma);

      await expect(service.purchase("user-1", "DOES_NOT_EXIST")).rejects.toThrow(NotFoundException);
    });

    it("baca 402 kada nema dovoljno coins-a", async () => {
      const tx = makeTx({ progression: { findUniqueOrThrow: jest.fn().mockResolvedValue({ coins: 10 }), update: jest.fn() } });
      const prisma = makePrisma(tx);
      const service = new ShopService(prisma);

      await expect(service.purchase("user-1", "FRAME_BRONZE")).rejects.toThrow(HttpException);
      expect(tx.userCosmetic.create).not.toHaveBeenCalled();
    });

    it("baca 403 kada vec ima predmet", async () => {
      const tx = makeTx({ userCosmetic: { findUnique: jest.fn().mockResolvedValue({ itemId: "FRAME_BRONZE" }), create: jest.fn() } });
      const prisma = makePrisma(tx);
      const service = new ShopService(prisma);

      await expect(service.purchase("user-1", "FRAME_BRONZE")).rejects.toThrow(ForbiddenException);
      expect(tx.userCosmetic.create).not.toHaveBeenCalled();
    });

    it("kupuje predmet, oduzima coins i vraca preostali saldo", async () => {
      const tx = makeTx({
        progression: { findUniqueOrThrow: jest.fn().mockResolvedValue({ coins: 1000 }), update: jest.fn().mockResolvedValue({ coins: 900 }) },
      });
      const prisma = makePrisma(tx);
      const service = new ShopService(prisma);

      const result = await service.purchase("user-1", "FRAME_BRONZE");

      expect(tx.userCosmetic.create).toHaveBeenCalledWith({ data: { userId: "user-1", itemId: "FRAME_BRONZE" } });
      expect(tx.progression.update).toHaveBeenCalledWith({ where: { userId: "user-1" }, data: { coins: { decrement: 100 } } });
      expect(result).toMatchObject({ item: { id: "FRAME_BRONZE", owned: true, equipped: false }, coins: 900 });
    });
  });

  describe("equip", () => {
    it("baca 404 za nepostojeci predmet", async () => {
      const prisma = makePrisma(makeTx());
      const service = new ShopService(prisma);

      await expect(service.equip("user-1", "DOES_NOT_EXIST")).rejects.toThrow(NotFoundException);
    });

    it("baca 403 kada korisnik nema predmet u vlasnistvu", async () => {
      const prisma = makePrisma(makeTx(), { userCosmetic: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new ShopService(prisma);

      await expect(service.equip("user-1", "FRAME_BRONZE")).rejects.toThrow(ForbiddenException);
    });

    it("oprema predmet iz odgovarajuce kategorije", async () => {
      const profileUpdate = jest.fn().mockResolvedValue({});
      const prisma = makePrisma(makeTx(), {
        userCosmetic: { findUnique: jest.fn().mockResolvedValue({ itemId: "FRAME_BRONZE" }), findMany: jest.fn().mockResolvedValue([{ itemId: "FRAME_BRONZE" }]) },
        profile: { findUnique: jest.fn().mockResolvedValue({ equippedAvatarFrameId: "FRAME_BRONZE", equippedTitleId: null }), update: profileUpdate },
      });
      const service = new ShopService(prisma);

      const result = await service.equip("user-1", "FRAME_BRONZE");

      expect(profileUpdate).toHaveBeenCalledWith({ where: { userId: "user-1" }, data: { equippedAvatarFrameId: "FRAME_BRONZE" } });
      expect(result.find((item) => item.id === "FRAME_BRONZE")).toMatchObject({ equipped: true });
    });
  });

  describe("unequip", () => {
    it("uklanja opremljen predmet za datu kategoriju", async () => {
      const profileUpdate = jest.fn().mockResolvedValue({});
      const prisma = makePrisma(makeTx(), { profile: { findUnique: jest.fn().mockResolvedValue({ equippedAvatarFrameId: null, equippedTitleId: null }), update: profileUpdate } });
      const service = new ShopService(prisma);

      await service.unequip("user-1", "TITLE");

      expect(profileUpdate).toHaveBeenCalledWith({ where: { userId: "user-1" }, data: { equippedTitleId: null } });
    });
  });
});
