import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import type { SupabaseService } from "../supabase/supabase.service";

function makeContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: unknown };
} {
  const request = { headers, user: undefined as unknown };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe("SupabaseAuthGuard", () => {
  it("baca UnauthorizedException kada nedostaje Authorization header", async () => {
    const supabaseService = { verifyAccessToken: jest.fn() } as unknown as SupabaseService;
    const guard = new SupabaseAuthGuard(supabaseService);
    const { context } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(supabaseService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it("baca UnauthorizedException kada header nije Bearer oblika", async () => {
    const supabaseService = { verifyAccessToken: jest.fn() } as unknown as SupabaseService;
    const guard = new SupabaseAuthGuard(supabaseService);
    const { context } = makeContext({ authorization: "Basic xyz" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("baca UnauthorizedException kada SupabaseService ne prepozna token", async () => {
    const supabaseService = {
      verifyAccessToken: jest.fn().mockResolvedValue(null),
    } as unknown as SupabaseService;
    const guard = new SupabaseAuthGuard(supabaseService);
    const { context } = makeContext({ authorization: "Bearer invalid-token" });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(supabaseService.verifyAccessToken).toHaveBeenCalledWith("invalid-token");
  });

  it("kaci korisnika na request.user i vraca true za validan token", async () => {
    const user = { id: "user-123", email: "hunter@example.com" };
    const supabaseService = {
      verifyAccessToken: jest.fn().mockResolvedValue(user),
    } as unknown as SupabaseService;
    const guard = new SupabaseAuthGuard(supabaseService);
    const { context, request } = makeContext({ authorization: "Bearer valid-token" });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(user);
  });
});
