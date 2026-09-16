import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  registerPushTokenRequestSchema,
  unregisterPushTokenRequestSchema,
  type RegisterPushTokenRequest,
  type UnregisterPushTokenRequest,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("push-token")
  @HttpCode(HttpStatus.NO_CONTENT)
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerPushTokenRequestSchema)) dto: RegisterPushTokenRequest,
  ): Promise<void> {
    return this.notificationsService.registerToken(user.id, dto);
  }

  @Delete("push-token")
  @HttpCode(HttpStatus.NO_CONTENT)
  unregister(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(unregisterPushTokenRequestSchema)) dto: UnregisterPushTokenRequest,
  ): Promise<void> {
    return this.notificationsService.unregisterToken(user.id, dto.token);
  }
}
