import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { SupabaseAuthGuard, type AuthenticatedRequest } from "./supabase-auth.guard";
import type { SupabaseJwtVerifier } from "./supabase-jwt-verifier";

function createContext(authorizationHeader?: string): {
  context: ExecutionContext;
  request: Partial<AuthenticatedRequest>;
} {
  const request: Partial<AuthenticatedRequest> = {
    headers: { authorization: authorizationHeader } as AuthenticatedRequest["headers"],
  };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, request };
}

describe("SupabaseAuthGuard", () => {
  it("baca UnauthorizedException kada nema Authorization header-a", async () => {
    const verifier = { verify: jest.fn() } as unknown as SupabaseJwtVerifier;
    const guard = new SupabaseAuthGuard(verifier);
    const { context } = createContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("baca UnauthorizedException za malformisan header (bez Bearer prefiksa)", async () => {
    const verifier = { verify: jest.fn() } as unknown as SupabaseJwtVerifier;
    const guard = new SupabaseAuthGuard(verifier);
    const { context } = createContext("Basic abc123");

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(verifier.verify).not.toHaveBeenCalled();
  });

  it("baca UnauthorizedException kada verifikacija tokena ne uspe", async () => {
    const verifier = {
      verify: jest.fn().mockRejectedValue(new Error("expired")),
    } as unknown as SupabaseJwtVerifier;
    const guard = new SupabaseAuthGuard(verifier);
    const { context } = createContext("Bearer bad-token");

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it("postavlja request.playerId i vraca true za validan token", async () => {
    const verifier = {
      verify: jest.fn().mockResolvedValue({ id: "player-123" }),
    } as unknown as SupabaseJwtVerifier;
    const guard = new SupabaseAuthGuard(verifier);
    const { context, request } = createContext("Bearer good-token");

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.playerId).toBe("player-123");
    expect(verifier.verify).toHaveBeenCalledWith("good-token");
  });
});
