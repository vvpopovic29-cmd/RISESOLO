import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PRO_ENTITLEMENT_ID, isEntitlementActive } from "@risesolo/domain";
import type { RevenueCatWebhookEvent, SubscriptionStatusDto } from "@risesolo/validation";
import type { SubscriptionStore } from "@prisma/client";
import type { ApiEnv } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

const STORE_MAP: Record<string, SubscriptionStore> = {
  app_store: "APP_STORE",
  mac_app_store: "APP_STORE",
  play_store: "PLAY_STORE",
  stripe: "STRIPE",
  promotional: "PROMOTIONAL",
};

/// Ovi event tipovi znace da pretplata vise nece automatski da se obnovi -
/// `willRenew` ide na false, ali `expiresAt` ostaje (RevenueCat ga uvek salje)
/// pa entitlement ostaje aktivan do isteka perioda za koji je vec placeno.
const NON_RENEWING_EVENT_TYPES = new Set(["CANCELLATION", "EXPIRATION"]);

/**
 * `pro_access` je jedini izvor istine za premium sadrzaj (isti princip kao
 * total_xp) - RevenueCat webhook je JEDINO mesto koje sme da menja
 * `Subscription` red; ovaj servis nikad ne prima entitlement direktno od
 * mobilnog klijenta (klijent samo cita GET /subscriptions/me).
 */
@Injectable()
export class SubscriptionsService {
  private readonly webhookAuthHeader: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService<ApiEnv, true>,
  ) {
    this.webhookAuthHeader = configService.get("REVENUECAT_WEBHOOK_AUTH_HEADER", { infer: true });
  }

  async getStatus(userId: string): Promise<SubscriptionStatusDto> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription) {
      return { isPro: false, productId: null, expiresAt: null, willRenew: false };
    }
    return {
      isPro: isEntitlementActive(subscription.expiresAt, new Date()),
      productId: subscription.productId,
      expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
      willRenew: subscription.willRenew,
    };
  }

  async hasProAccess(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    return subscription ? isEntitlementActive(subscription.expiresAt, new Date()) : false;
  }

  /**
   * Bez konfigurisanog `REVENUECAT_WEBHOOK_AUTH_HEADER`, webhook je namerno
   * onemogucen (fail-closed) - RevenueCat jos nije podesen (vidi
   * src/config/env.ts), pa ne postoji vrednost sa kojom bi poredili.
   */
  verifyWebhookAuth(authHeader: string | undefined): void {
    if (!this.webhookAuthHeader || authHeader !== this.webhookAuthHeader) {
      throw new UnauthorizedException("Nevazeci RevenueCat webhook potpis");
    }
  }

  async handleWebhookEvent(payload: RevenueCatWebhookEvent): Promise<void> {
    const { event } = payload;
    if (!event.entitlement_ids.includes(PRO_ENTITLEMENT_ID)) {
      return; // Event se ne tice entitlement-a koji pratimo (npr. drugi proizvod).
    }

    const user = await this.prisma.user.findUnique({ where: { id: event.app_user_id } });
    if (!user) {
      return; // Nepoznat app_user_id (test event iz RevenueCat dashboard-a i sl.) - ignorisi.
    }

    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    const willRenew = !NON_RENEWING_EVENT_TYPES.has(event.type);
    const store = STORE_MAP[event.store?.toLowerCase() ?? ""] ?? "UNKNOWN";

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        entitlementId: PRO_ENTITLEMENT_ID,
        productId: event.product_id ?? null,
        store,
        expiresAt,
        willRenew,
        originalTransactionId: event.original_transaction_id ?? null,
      },
      update: {
        productId: event.product_id ?? null,
        store,
        expiresAt,
        willRenew,
        originalTransactionId: event.original_transaction_id ?? null,
      },
    });
  }
}
