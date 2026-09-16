import { z } from "zod";

export const PUSH_PLATFORMS = ["IOS", "ANDROID"] as const;

/** POST /notifications/push-token - Expo push token je unique po fizickom uredjaju (vidi PushToken model). */
export const registerPushTokenRequestSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(PUSH_PLATFORMS),
});
export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>;

/** DELETE /notifications/push-token - odjavljuje token pri logout-u. */
export const unregisterPushTokenRequestSchema = z.object({
  token: z.string().min(1),
});
export type UnregisterPushTokenRequest = z.infer<typeof unregisterPushTokenRequestSchema>;
