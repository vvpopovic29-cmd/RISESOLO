import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { type AuthResponse, type LoginRequest, type RegisterRequest, loginRequestSchema, registerRequestSchema } from "@risesolo/validation";
import { isTestEnvironment, TEST_THROTTLE_LIMIT } from "../common/throttle";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

/** Strozi limit nego globalni default (60/min) - register/login su meta brute-force/spam napada. */
const AUTH_THROTTLE = { default: { limit: isTestEnvironment() ? TEST_THROTTLE_LIMIT : 5, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle(AUTH_THROTTLE)
  register(@Body(new ZodValidationPipe(registerRequestSchema)) dto: RegisterRequest): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  login(@Body(new ZodValidationPipe(loginRequestSchema)) dto: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(dto);
  }
}
