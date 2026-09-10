import { Injectable } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- NestJS DI treba pravu (value) referencu za emitDecoratorMetadata
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import type { ApiEnv } from "../config/env";

export interface VerifiedSupabaseUser {
  readonly id: string;
}

/**
 * Verifikuje Supabase Auth JWT protiv projektovog JWKS endpoint-a
 * (`/auth/v1/.well-known/jwks.json`) - bez deljenog tajnog kljuca. Ovo je
 * trenutni preporuceni pristup za Supabase projekte (asimetricno
 * potpisivanje); javni kljucevi se kesiraju i automatski osvezavaju od
 * strane `jose`.
 */
@Injectable()
export class SupabaseJwtVerifier {
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string;

  constructor(configService: ConfigService<ApiEnv, true>) {
    const supabaseUrl = configService.get("SUPABASE_URL", { infer: true });
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }

  async verify(token: string): Promise<VerifiedSupabaseUser> {
    const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer });
    return { id: requireSubject(payload) };
  }
}

function requireSubject(payload: JWTPayload): string {
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("JWT nema validan 'sub' claim");
  }
  return payload.sub;
}
