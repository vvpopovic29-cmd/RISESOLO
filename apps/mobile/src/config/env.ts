import { envPrimitives, loadEnv, z } from "@risesolo/validation";

/**
 * Expo inlinira `EXPO_PUBLIC_*` promenljive u bundle u build-time. Ako
 * promenljiva nije postavljena (npr. lokalno bez .env fajla), padamo na
 * razuman default za localhost umesto da rusimo app na startu.
 */
const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: envPrimitives.url.default("http://localhost:3000"),
  // RevenueCat SDK kljucevi su JAVNI (publishable) po dizajnu - identifikuju
  // app RevenueCat-u, stvarna sigurnost je na App Store/Play receipt
  // validaciji. Opciono: bez njih PurchasesService.configure() je no-op
  // (vidi src/subscriptions/purchases.ts) - RevenueCat Dashboard/Store
  // konfiguracija jos nije zavrsena (Faza: Subscriptions/RevenueCat).
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: z.string().min(1).optional(),
  // Opciono - Sentry DSN (sentry.io -> Project Settings -> Client Keys),
  // JAVAN po dizajnu (isti princip kao RevenueCat kljucevi - identifikuje
  // projekat, ne autentifikuje). Bez njega je monitoring/sentry.ts no-op
  // (vidi tamo) - stvarna registracija/native config zahteva EAS build
  // (Sentry SDK je delimicno nativni modul), isto ogranicenje kao
  // react-native-purchases (vidi README "EAS Build").
  EXPO_PUBLIC_SENTRY_DSN: z.string().min(1).optional(),
});

const env = loadEnv(
  mobileEnvSchema,
  {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  },
  "apps/mobile",
);

export function getApiBaseUrl(): string {
  return env.EXPO_PUBLIC_API_URL;
}

export function getRevenueCatApiKey(platform: "ios" | "android"): string | undefined {
  return platform === "ios" ? env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY : env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
}

export function getSentryDsn(): string | undefined {
  return env.EXPO_PUBLIC_SENTRY_DSN;
}
