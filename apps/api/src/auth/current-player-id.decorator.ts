import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "./supabase-auth.guard";

/** Izvlaci `playerId` koji je SupabaseAuthGuard postavio na request. */
export const CurrentPlayerId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.playerId;
  },
);
