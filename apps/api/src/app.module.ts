import { BullModule } from "@nestjs/bullmq";
import { Logger, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import type { RedisOptions } from "ioredis";
import Redis from "ioredis";
import { CacheModule } from "./cache/cache.module";
import { ResilientThrottlerGuard } from "./common/resilient-throttler.guard";
import { isTestEnvironment, TEST_THROTTLE_LIMIT } from "./common/throttle";
import type { ApiEnv } from "./config/env";
import { validateApiEnv } from "./config/env";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PlayersModule } from "./players/players.module";
import { ExercisesModule } from "./exercises/exercises.module";
import { QuestsModule } from "./quests/quests.module";
import { WorkoutsModule } from "./workouts/workouts.module";
import { TrainingPlansModule } from "./training-plans/training-plans.module";
import { NutritionModule } from "./nutrition/nutrition.module";
import { GuildsModule } from "./guilds/guilds.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AchievementsModule } from "./achievements/achievements.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";
import { ShopModule } from "./shop/shop.module";
import { FriendsModule } from "./friends/friends.module";
import { InventoryModule } from "./inventory/inventory.module";

const bullConnectionLogger = new Logger("BullMQRedisConnection");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateApiEnv,
    }),
    // Globalni rate limit (60 zahteva/minut po IP) - bezbednosna mera protiv
    // brute-force/spam-a, ne poslovno pravilo. Auth register/login imaju
    // strozi limit preko @Throttle na kontroleru (vidi auth.controller.ts).
    // U testovima je limit prakticno neogranicen - vidi common/throttle.ts.
    // Storage je Redis-backed (deljen izmedju vise API instanci umesto
    // in-memory po procesu) - ResilientThrottlerGuard ispod obezbedjuje da
    // nedostupnost Redis-a ne obori zahteve (vidi taj fajl za obrazlozenje).
    // Konekcija namerno NIJE default `new Redis(url)` (default retry/offline
    // queue ponasanje moze da drzi zahtev da visi desetinama sekundi pre nego
    // sto konacno baci gresku koju guard hvata) - isti fail-fast princip kao
    // CacheService (vidi cache/cache.service.ts). Prosledjuje se (url, options)
    // - NE vec-konstruisan Redis klijent - jer `ThrottlerStorageRedisService`
    // gasi konekciju u `onModuleDestroy` SAMO kada je sam konstruise (interni
    // `disconnectRequired` flag); vec-konstruisan klijent bi ostao otvoren
    // posle `app.close()` u svakom e2e test fajlu.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnv, true>) => {
        const redisOptions: RedisOptions = {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 500, 5000),
        };
        return {
          throttlers: [{ name: "default", ttl: 60_000, limit: isTestEnvironment() ? TEST_THROTTLE_LIMIT : 60 }],
          storage: new ThrottlerStorageRedisService(configService.get("REDIS_URL"), redisOptions),
        };
      },
    }),
    // Deljena Redis konekcija za BullMQ (odvojena od throttler storage-a i
    // CacheService-a - vidi cache/cache.service.ts za obrazlozenje zasto).
    // `maxRetriesPerRequest: null` je BullMQ hard-requirement za worker
    // konekcije (blocking komande, vidi BullMQ dokumentaciju).
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnv, true>) => {
        const connection = new Redis(configService.get("REDIS_URL"), {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });
        connection.on("error", (error) => bullConnectionLogger.warn(error.message));
        return { connection };
      },
    }),
    CacheModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    PlayersModule,
    ExercisesModule,
    QuestsModule,
    WorkoutsModule,
    TrainingPlansModule,
    NutritionModule,
    GuildsModule,
    SubscriptionsModule,
    NotificationsModule,
    AchievementsModule,
    LeaderboardModule,
    ShopModule,
    FriendsModule,
    InventoryModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ResilientThrottlerGuard }],
})
export class AppModule {}
