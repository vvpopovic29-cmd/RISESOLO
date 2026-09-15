import type { CanActivate, ExecutionContext} from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseService } from "../supabase/supabase.service";
import type { CurrentUser } from "./current-user";

const BEARER_PREFIX = "Bearer ";

/**
 * Izvlaci Supabase Auth JWT iz `Authorization: Bearer <token>` i verifikuje
 * ga preko SupabaseService.verifyAccessToken (poziva Supabase Auth, ne
 * dekodira JWT lokalno - nema rizika od pogresne/zastarele signing kljuc
 * konfiguracije). Rezultat kaci na `request.user` za @CurrentUser().
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: CurrentUser }>();
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException("Nedostaje Authorization: Bearer <token> header");
    }

    const accessToken = header.slice(BEARER_PREFIX.length).trim();
    const user = await this.supabaseService.verifyAccessToken(accessToken);

    if (!user) {
      throw new UnauthorizedException("Nevalidan ili istekao token");
    }

    request.user = user;
    return true;
  }
}
