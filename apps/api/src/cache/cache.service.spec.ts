import type { ConfigService } from "@nestjs/config";
import type { ApiEnv } from "../config/env";
import { CacheService } from "./cache.service";

function makeConfigService(): ConfigService<ApiEnv, true> {
  return { get: () => "redis://localhost:6379" } as unknown as ConfigService<ApiEnv, true>;
}

function makeService(): { service: CacheService; client: { get: jest.Mock; set: jest.Mock } } {
  const service = new CacheService(makeConfigService());
  const client = { get: jest.fn(), set: jest.fn() };
  (service as unknown as { client: unknown }).client = client;
  return { service, client };
}

describe("CacheService", () => {
  describe("getJson", () => {
    it("vraca null kada kljuc ne postoji u kesu", async () => {
      const { service, client } = makeService();
      client.get.mockResolvedValue(null);

      await expect(service.getJson("k")).resolves.toBeNull();
    });

    it("parsira JSON vrednost kada kljuc postoji", async () => {
      const { service, client } = makeService();
      client.get.mockResolvedValue(JSON.stringify({ a: 1 }));

      await expect(service.getJson("k")).resolves.toEqual({ a: 1 });
    });

    it("vraca null umesto da baci gresku kada Redis nije dostupan (best-effort)", async () => {
      const { service, client } = makeService();
      client.get.mockRejectedValue(new Error("connection refused"));

      await expect(service.getJson("k")).resolves.toBeNull();
    });
  });

  describe("setJson", () => {
    it("upisuje JSON sa TTL preko EX opcije", async () => {
      const { service, client } = makeService();
      client.set.mockResolvedValue("OK");

      await service.setJson("k", { a: 1 }, 30);

      expect(client.set).toHaveBeenCalledWith("k", JSON.stringify({ a: 1 }), "EX", 30);
    });

    it("ne baca gresku na gore kada Redis nije dostupan (best-effort)", async () => {
      const { service, client } = makeService();
      client.set.mockRejectedValue(new Error("connection refused"));

      await expect(service.setJson("k", { a: 1 }, 30)).resolves.toBeUndefined();
    });
  });
});
