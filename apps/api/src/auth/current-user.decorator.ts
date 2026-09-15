import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { CurrentUser } from "./current-user";

/** Koristi se SAMO na rutama iza SupabaseAuthGuard - guard garantuje da je request.user postavljen. */
export const CurrentUserDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: CurrentUser }>();
    return request.user;
  },
);
