import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * `expo-secure-store` nema pravu web implementaciju (native-only keychain/
 * keystore) - njen web modul je prazan stub i baca TypeError na poziv. Na
 * webu (samo `expo export --platform web` build-check, ne primarna meta)
 * padamo na `localStorage`; na iOS/Android koristimo pravi SecureStore.
 */
async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Privatni mod / blokirano skladiste - nastavljamo bez persistencije.
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // vidi setItem
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = { getItem, setItem, deleteItem };
