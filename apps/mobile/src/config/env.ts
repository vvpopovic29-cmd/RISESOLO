import { envPrimitives, loadEnv, z } from "@risesolo/validation";

/**
 * Expo inlinira `EXPO_PUBLIC_*` promenljive u bundle u build-time. Ako
 * promenljiva nije postavljena (npr. lokalno bez .env fajla), padamo na
 * razuman default za localhost umesto da rusimo app na startu.
 */
const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: envPrimitives.url.default("http://localhost:3000"),
  // Faza 2 - Supabase projekat "RISESOLO" (supabase/README.md). anon/
  // publishable key je javno bezbedan (RLS ga ogranicava na klijentu).
  // Koristi se od Faze 10 (Auth) nadalje - Supabase Auth SDK zove ove
  // endpointe direktno sa klijenta.
  EXPO_PUBLIC_SUPABASE_URL: envPrimitives.url,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: envPrimitives.nonEmptyString,
});

const env = loadEnv(
  mobileEnvSchema,
  {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  "apps/mobile",
);

export function getApiBaseUrl(): string {
  return env.EXPO_PUBLIC_API_URL;
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  return { url: env.EXPO_PUBLIC_SUPABASE_URL, anonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY };
}
