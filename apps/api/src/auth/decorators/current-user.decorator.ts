import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}

interface RequestWithUser {
  user: AuthenticatedUser;
}

/** Dostupno samo iza `JwtAuthGuard` - `req.user` postavlja `JwtStrategy.validate`. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});
