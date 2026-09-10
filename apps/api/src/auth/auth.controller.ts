import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@risesolo/validation";
import { loginRequestSchema, registerRequestSchema } from "@risesolo/validation";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(
    @Body(new ZodValidationPipe(registerRequestSchema)) body: RegisterRequest,
  ): Promise<AuthResponse> {
    return this.authService.register(body);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
  ): Promise<AuthResponse> {
    return this.authService.login(body);
  }
}
