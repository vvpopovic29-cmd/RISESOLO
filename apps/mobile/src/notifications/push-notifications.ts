import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

/**
 * Push notifikacije - `getExpoPushTokenAsync` zahteva EAS `projectId` (upisan
 * u `app.json` -> `extra.eas.projectId` tek posle `eas init`, vidi README
 * "EAS Build"). Dok taj korak nije odradjen, registracija je namerno no-op
 * (graceful, isti princip kao RevenueCat API kljucevi) umesto da baca
 * gresku. Takodje se nikad ne pokusava na webu - `expo-notifications` nema
 * push registraciju za web platformu u ovom setup-u.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export interface RegisteredPushToken {
  token: string;
  platform: "IOS" | "ANDROID";
}

function isNotificationsAvailable(): boolean {
  return Platform.OS !== "web";
}

function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId;
}

/** Trazi dozvolu (ako vec nije data) i vraca Expo push token. `null` ako bilo sta nije spremno (web, bez EAS projectId, odbijena dozvola, mrezna greska). */
export async function registerForPushNotificationsAsync(): Promise<RegisteredPushToken | null> {
  if (!isNotificationsAvailable()) {
    return null;
  }
  const projectId = getEasProjectId();
  if (!projectId) {
    return null;
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    const finalStatus = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!finalStatus.granted) {
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" };
  } catch {
    return null;
  }
}

/** Poziva se na tap notifikacije (foreground ili background) - vraca unsubscribe funkciju. */
export function addNotificationTapListener(onTap: (data: Record<string, unknown>) => void): () => void {
  if (!isNotificationsAvailable()) {
    return () => undefined;
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onTap(response.notification.request.content.data ?? {});
  });
  return () => subscription.remove();
}
