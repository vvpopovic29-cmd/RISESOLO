import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { isTestEnvironment, TEST_THROTTLE_LIMIT } from "./common/throttle";
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
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: isTestEnvironment() ? TEST_THROTTLE_LIMIT : 60 }]),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
