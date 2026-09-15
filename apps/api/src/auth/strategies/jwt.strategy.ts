import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { ApiEnv } from "../../config/env";
import type { AuthenticatedUser } from "../decorators/current-user.decorator";

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<ApiEnv, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_SECRET", { infer: true }),
    });
  }

  // Poziva se nakon sto passport-jwt verifikuje potpis/expiraciju tokena.
  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, email: payload.email };
  }
}
