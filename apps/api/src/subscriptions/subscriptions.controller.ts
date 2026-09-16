import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  revenueCatWebhookEventSchema,
  type RevenueCatWebhookEvent,
  type SubscriptionStatusDto,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SubscriptionsService } from "./subscriptions.service";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: AuthenticatedUser): Promise<SubscriptionStatusDto> {
    return this.subscriptionsService.getStatus(user.id);
  }

  /**
   * RevenueCat poziva ovo direktno server-to-server (Project Settings ->
   * Integrations -> Webhooks) - autentifikacija je preko custom
   * "Authorization" header vrednosti (verifyWebhookAuth), NAMERNO bez
   * JwtAuthGuard-a (RevenueCat nema nas JWT).
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Headers("authorization") authHeader: string | undefined,
    @Body(new ZodValidationPipe(revenueCatWebhookEventSchema)) payload: RevenueCatWebhookEvent,
  ): Promise<{ received: true }> {
    this.subscriptionsService.verifyWebhookAuth(authHeader);
    await this.subscriptionsService.handleWebhookEvent(payload);
    return { received: true };
  }
}
