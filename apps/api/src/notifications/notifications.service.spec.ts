import type { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

function makePrisma(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    pushToken: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      ...overrides,
    },
  } as unknown as PrismaService;
}

describe("NotificationsService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe("registerToken", () => {
    it("upsert-uje po tokenu (ne po userId) - prebacuje vlasnistvo ako je token vec zauzet", async () => {
      const prisma = makePrisma();
      const service = new NotificationsService(prisma);

      await service.registerToken("user-1", { token: "tok-1", platform: "IOS" });

      expect(prisma.pushToken.upsert).toHaveBeenCalledWith({
        where: { token: "tok-1" },
        create: { userId: "user-1", token: "tok-1", platform: "IOS" },
        update: { userId: "user-1", platform: "IOS" },
      });
    });
  });

  describe("unregisterToken", () => {
    it("brise preko deleteMany sa userId+token filterom (ownership provera)", async () => {
      const prisma = makePrisma();
      const service = new NotificationsService(prisma);

      await service.unregisterToken("user-1", "tok-1");

      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", token: "tok-1" } });
    });
  });

  describe("sendToUser / sendToUsers", () => {
    it("ne poziva Expo API kada korisnik nema registrovan token", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue([]) });
      const service = new NotificationsService(prisma);

      await service.sendToUser("user-1", { title: "T", body: "B" });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("salje POST na Expo push API sa porukom po tokenu", async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as unknown as typeof fetch;
      const prisma = makePrisma({
        findMany: jest.fn().mockResolvedValue([{ token: "tok-1" }, { token: "tok-2" }]),
      });
      const service = new NotificationsService(prisma);

      await service.sendToUsers(["user-1"], { title: "Boss Quest pobedjen!", body: "Cestitamo" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://exp.host/--/api/v2/push/send",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify([
            { to: "tok-1", title: "Boss Quest pobedjen!", body: "Cestitamo" },
            { to: "tok-2", title: "Boss Quest pobedjen!", body: "Cestitamo" },
          ]),
        }),
      );
    });

    it("ne baca gresku na gore ako Expo poziv ne uspe (fire-and-forget)", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue([{ token: "tok-1" }]) });
      const service = new NotificationsService(prisma);

      await expect(service.sendToUser("user-1", { title: "T", body: "B" })).resolves.toBeUndefined();
    });

    it("vraca odmah bez upita bazi kada je lista korisnika prazna", async () => {
      const findManyMock = jest.fn();
      const prisma = makePrisma({ findMany: findManyMock });
      const service = new NotificationsService(prisma);

      await service.sendToUsers([], { title: "T", body: "B" });

      expect(findManyMock).not.toHaveBeenCalled();
    });
  });
});
