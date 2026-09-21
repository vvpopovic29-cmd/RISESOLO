import { envPrimitives, loadEnv, z } from "@risesolo/validation";

export const apiEnvSchema = z.object({
  NODE_ENV: envPrimitives.nodeEnv,
  PORT: envPrimitives.port.default(3000),
  DATABASE_URL: envPrimitives.url,
  REDIS_URL: envPrimitives.url,
  JWT_SECRET: envPrimitives.nonEmptyString,
  JWT_EXPIRES_IN: z.string().default("7d"),
  // Opciono - bez ovoga AI trening planovi vracaju 503 (vidi src/ai/ai.service.ts),
  // ostatak aplikacije radi normalno. Namerno placeholder-friendly (Faza 2: AI planovi).
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  // Opciono - vrednost "Authorization" header-a koju RevenueCat salje nazad
  // sa svakim webhook pozivom (podeseno u RevenueCat Dashboard-u: Project
  // Settings -> Integrations -> Webhooks). Bez ovoga je webhook FAIL-CLOSED
  // (uvek 401), ne fail-open - vidi src/subscriptions/subscriptions.service.ts.
  REVENUECAT_WEBHOOK_AUTH_HEADER: z.string().min(1).optional(),
  // Opciono - Sentry DSN (sentry.io -> Project Settings -> Client Keys).
  // Bez ovoga Sentry.init() se NIKAD ne poziva (vidi src/common/sentry.ts) -
  // neuhvacene greske se i dalje loguju preko NestJS Logger-a, samo ne
  // stizu do Sentry dashboard-a. Isti "placeholder-friendly" princip kao
  // ANTHROPIC_API_KEY/REVENUECAT_WEBHOOK_AUTH_HEADER.
  SENTRY_DSN: z.string().min(1).optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

/**
 * Prosledjuje se u `ConfigModule.forRoot({ validate })` - Nest poziva ovu
 * funkciju jednom pri startu sa sirovim `process.env`. Ako environment nije
 * validan, aplikacija ne sme da se podigne (fail-fast), pa greska namerno
 * probija dalje umesto da se guta.
 */
export function validateApiEnv(config: Record<string, unknown>): ApiEnv {
  return loadEnv(apiEnvSchema, config as Record<string, string | undefined>, "apps/api");
}
