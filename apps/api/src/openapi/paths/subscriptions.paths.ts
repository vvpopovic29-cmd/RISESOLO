import { revenueCatWebhookEventSchema, subscriptionStatusSchema, z } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerSubscriptionsPaths(): void {
  const SubscriptionStatus = registry.register("SubscriptionStatus", subscriptionStatusSchema);
  const RevenueCatWebhookEvent = registry.register("RevenueCatWebhookEvent", revenueCatWebhookEventSchema);
  const WebhookAck = registry.register("WebhookAck", z.object({ received: z.literal(true) }));

  registry.registerPath({
    method: "get",
    path: "/subscriptions/me",
    tags: ["Subscriptions"],
    summary: "Trenutni pretplatnički status",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(SubscriptionStatus),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/subscriptions/webhook",
    tags: ["Subscriptions"],
    summary: "RevenueCat server-to-server webhook",
    description:
      "Namerno BEZ JWT-a - RevenueCat autentifikaciju šalje kroz Authorization header koji mora da se poklopi sa REVENUECAT_WEBHOOK_AUTH_HEADER. Bez te env promenljive je fail-closed (uvek 401).",
    request: {
      headers: [z.string().optional().openapi({ param: { name: "authorization", in: "header" } })],
      body: jsonBody(RevenueCatWebhookEvent),
    },
    responses: {
      200: jsonResponse(WebhookAck),
      400: badRequestResponse,
      401: { description: "Authorization header se ne poklapa sa REVENUECAT_WEBHOOK_AUTH_HEADER (ili nije podešen)" },
    },
  });
}
