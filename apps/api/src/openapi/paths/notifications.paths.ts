import { registerPushTokenRequestSchema, unregisterPushTokenRequestSchema } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, noContentResponse, registry } from "../registry";

export function registerNotificationsPaths(): void {
  const RegisterPushTokenRequest = registry.register("RegisterPushTokenRequest", registerPushTokenRequestSchema);
  const UnregisterPushTokenRequest = registry.register("UnregisterPushTokenRequest", unregisterPushTokenRequestSchema);

  registry.registerPath({
    method: "post",
    path: "/notifications/push-token",
    tags: ["Notifications"],
    summary: "Registruj Expo push token za ovaj uređaj",
    security: AUTH_SECURITY,
    request: { body: jsonBody(RegisterPushTokenRequest) },
    responses: {
      204: noContentResponse,
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/notifications/push-token",
    tags: ["Notifications"],
    summary: "Odjavi Expo push token",
    security: AUTH_SECURITY,
    request: { body: jsonBody(UnregisterPushTokenRequest) },
    responses: {
      204: noContentResponse,
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });
}
