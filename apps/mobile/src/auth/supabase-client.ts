import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../config/env";

const { url, anonKey } = getSupabaseConfig();

/**
 * AsyncStorage (ne expo-secure-store) je zvanicno preporuceni Supabase
 * session storage adapter za Expo - SecureStore ima ~2KB limit po stavci
 * sto moze da presece JWT access/refresh token par. Anon kljuc je javan po
 * dizajnu (RLS je stvarna kontrola pristupa), bezbedno je ugraditi ga u
 * mobile bundle.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
