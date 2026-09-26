import type { PushNotificationContent } from "./notifications.service";

export const PUSH_NOTIFICATIONS_QUEUE = "push-notifications";

export interface ExpoPushMessage extends PushNotificationContent {
  to: string;
}
