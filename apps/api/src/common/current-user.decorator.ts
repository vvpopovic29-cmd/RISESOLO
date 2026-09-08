import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  readonly userId: string;
  readonly email: string;
}

interface RequestWithUser {
  user: AuthenticatedUser;
}

/**
 * Izvlaci korisnika koji je JwtAuthGuard/JwtStrategy vec postavio na
 * `request.user`. Koristi se samo u rutama zasticenim JwtAuthGuard-om.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
