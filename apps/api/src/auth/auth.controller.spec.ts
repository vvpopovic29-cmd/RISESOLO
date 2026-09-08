import { Test, type TestingModule } from "@nestjs/testing";
import type { AuthResponse } from "@risesolo/validation";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  const authResponse: AuthResponse = {
    accessToken: "token",
    user: { id: "user-1", email: "hunter@risesolo.app", displayName: "Hunter" },
  };
  const authService = {
    register: jest.fn().mockResolvedValue(authResponse),
    login: jest.fn().mockResolvedValue(authResponse),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it("register delegira na AuthService.register", async () => {
    const body = { email: "hunter@risesolo.app", password: "password123", displayName: "Hunter" };
    const result = await controller.register(body);

    expect(authService.register).toHaveBeenCalledWith(body);
    expect(result).toBe(authResponse);
  });

  it("login delegira na AuthService.login", async () => {
    const body = { email: "hunter@risesolo.app", password: "password123" };
    const result = await controller.login(body);

    expect(authService.login).toHaveBeenCalledWith(body);
    expect(result).toBe(authResponse);
  });
});
