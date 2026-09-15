import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { type AuthResponse, type LoginRequest, type RegisterRequest, loginRequestSchema, registerRequestSchema } from "@risesolo/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerRequestSchema)) dto: RegisterRequest): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginRequestSchema)) dto: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(dto);
  }
}
