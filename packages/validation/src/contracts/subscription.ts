import { z } from "zod";

/** GET /subscriptions/me - `isPro` je uvek izveden na serveru (nikad ne veruj klijentu). */
export const subscriptionStatusSchema = z.object({
  isPro: z.boolean(),
  productId: z.string().nullable(),
  expiresAt: z.string().nullable(),
  willRenew: z.boolean(),
});
export type SubscriptionStatusDto = z.infer<typeof subscriptionStatusSchema>;

/**
 * Minimalan podskup RevenueCat webhook event payload-a koji nam treba -
 * RevenueCat salje mnogo vise polja (vidi
 * https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields),
 * ovde parsiramo samo ono sto koristimo. `type` je namerno `z.string()` (ne
 * strogi enum) - RevenueCat s vremena na vreme dodaje nove event tipove koje
 * ne obradjujemo, ne zelimo da webhook pozivi zbog toga pocnu da bacaju 400.
 */
export const revenueCatWebhookEventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    entitlement_ids: z.array(z.string()).optional().default([]),
    product_id: z.string().nullable().optional(),
    store: z.string().optional(),
    expiration_at_ms: z.number().nullable().optional(),
    original_transaction_id: z.string().nullable().optional(),
  }),
});
export type RevenueCatWebhookEvent = z.infer<typeof revenueCatWebhookEventSchema>;
