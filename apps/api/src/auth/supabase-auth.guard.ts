import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import type { Request } from "express";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { SupabaseJwtVerifier } from "./supabase-jwt-verifier";

export interface AuthenticatedRequest extends Request {
  playerId: string;
}

/**
 * Zahteva validan Supabase Auth JWT u `Authorization: Bearer <token>`
 * header-u i postavlja `request.playerId` na `auth.uid()` iz tokena -
 * kontroleri/servisi nikad ne prihvataju player id kao deo request body-ja
 * ili query stringa, sto sprecava da jedan igrac cita/menja podatke drugog.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly verifier: SupabaseJwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException("Nedostaje Authorization: Bearer <token> header");
    }

    try {
      const user = await this.verifier.verify(token);
      request.playerId = user.id;
      return true;
    } catch {
      throw new UnauthorizedException("Nevalidan ili istekao token");
    }
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}
