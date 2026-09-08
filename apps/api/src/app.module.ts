import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateApiEnv } from "./config/env";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateApiEnv,
    }),
    HealthModule,
  ],
})
export class AppModule {}
