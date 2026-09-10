import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { validateApiEnv } from "./config/env";
import { HealthModule } from "./health/health.module";
import { PlayerModule } from "./player/player.module";
import { QuestsModule } from "./quests/quests.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateApiEnv,
    }),
    HealthModule,
    AuthModule,
    PlayerModule,
    QuestsModule,
  ],
})
export class AppModule {}
