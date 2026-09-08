import { envPrimitives, loadEnv, z } from "@risesolo/validation";

/**
 * Expo inlinira `EXPO_PUBLIC_*` promenljive u bundle u build-time. Ako
 * promenljiva nije postavljena (npr. lokalno bez .env fajla), padamo na
 * razuman default za localhost umesto da rusimo app na startu.
 */
const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: envPrimitives.url.default("http://localhost:3000"),
});

const env = loadEnv(
  mobileEnvSchema,
  { EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL },
  "apps/mobile",
);

export function getApiBaseUrl(): string {
  return env.EXPO_PUBLIC_API_URL;
}
