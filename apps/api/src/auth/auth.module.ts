import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { ApiEnv } from "../config/env";
import { PlayerModule } from "../player/player.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { InMemoryUsersRepository, USERS_REPOSITORY } from "./users.repository";

@Module({
  imports: [
    PlayerModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnv, true>) => ({
        secret: configService.get("JWT_SECRET", { infer: true }),
        signOptions: { expiresIn: configService.get("JWT_EXPIRES_IN", { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository },
  ],
})
export class AuthModule {}
