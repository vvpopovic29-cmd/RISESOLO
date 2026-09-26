import type { OnModuleDestroy } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { ApiEnv } from "../config/env";

/**
 * Best-effort read-kes za deljene, ne-per-user upite (lista cehova, top-N
 * leaderboard) - vidi README "Rate Limiting & Monitoring". Isti
 * "placeholder-friendly" princip kao Expo push/Sentry/AI (vidi
 * notifications/subscriptions/ai servise): Redis nedostupnost NIKAD ne sme
 * da obori request, samo da ga vrati na live upit ka bazi. `enableOfflineQueue:
 * false` + mali `maxRetriesPerRequest` obezbedjuju da poziv brzo baci gresku
 * (uhvacenu ispod) umesto da visi dok Redis ne postane dostupan - odvojena
 * konekcija od throttler storage-a i BullMQ-a jer ovima treba drugacije
 * ponasanje ponavljanja (vidi ResilientThrottlerGuard / BullModule konfiguraciju).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  constructor(configService: ConfigService<ApiEnv, true>) {
    this.client = new Redis(configService.get("REDIS_URL"), {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    this.client.on("error", (error) => this.logger.warn(`Redis kes konekcija: ${error.message}`));
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch (error) {
      this.logger.warn(`Citanje iz kesa nije uspelo (${key}): ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logger.warn(`Upis u kes nije uspeo (${key}): ${error instanceof Error ? error.message : error}`);
    }
  }
}
