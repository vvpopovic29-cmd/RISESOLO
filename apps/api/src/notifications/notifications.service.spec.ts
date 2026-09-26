import type { Queue } from "bullmq";
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

function makeQueue(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    add: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Queue;
}

describe("NotificationsService", () => {
  describe("registerToken", () => {
    it("upsert-uje po tokenu (ne po userId) - prebacuje vlasnistvo ako je token vec zauzet", async () => {
      const prisma = makePrisma();
      const service = new NotificationsService(prisma, makeQueue());

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
      const service = new NotificationsService(prisma, makeQueue());

      await service.unregisterToken("user-1", "tok-1");

      expect(prisma.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", token: "tok-1" } });
    });
  });

  describe("sendToUser / sendToUsers", () => {
    it("ne stavlja nista u red kada korisnik nema registrovan token", async () => {
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue([]) });
      const queue = makeQueue();
      const service = new NotificationsService(prisma, queue);

      await service.sendToUser("user-1", { title: "T", body: "B" });

      expect(queue.add).not.toHaveBeenCalled();
    });

    it("stavlja poruku po tokenu u BullMQ red za slanje", async () => {
      const prisma = makePrisma({
        findMany: jest.fn().mockResolvedValue([{ token: "tok-1" }, { token: "tok-2" }]),
      });
      const queue = makeQueue();
      const service = new NotificationsService(prisma, queue);

      await service.sendToUsers(["user-1"], { title: "Boss Quest pobedjen!", body: "Cestitamo" });

      expect(queue.add).toHaveBeenCalledWith("send", [
        { to: "tok-1", title: "Boss Quest pobedjen!", body: "Cestitamo" },
        { to: "tok-2", title: "Boss Quest pobedjen!", body: "Cestitamo" },
      ]);
    });

    it("ne baca gresku na gore ako stavljanje u red ne uspe (best-effort)", async () => {
      const prisma = makePrisma({ findMany: jest.fn().mockResolvedValue([{ token: "tok-1" }]) });
      const queue = makeQueue({ add: jest.fn().mockRejectedValue(new Error("redis down")) });
      const service = new NotificationsService(prisma, queue);

      await expect(service.sendToUser("user-1", { title: "T", body: "B" })).resolves.toBeUndefined();
    });

    it("vraca odmah bez upita bazi kada je lista korisnika prazna", async () => {
      const findManyMock = jest.fn();
      const prisma = makePrisma({ findMany: findManyMock });
      const queue = makeQueue();
      const service = new NotificationsService(prisma, queue);

      await service.sendToUsers([], { title: "T", body: "B" });

      expect(findManyMock).not.toHaveBeenCalled();
      expect(queue.add).not.toHaveBeenCalled();
    });
  });
});
