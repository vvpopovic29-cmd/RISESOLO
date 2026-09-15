import { envPrimitives, loadEnv, z } from "@risesolo/validation";

export const apiEnvSchema = z.object({
  NODE_ENV: envPrimitives.nodeEnv,
  PORT: envPrimitives.port.default(3000),
  DATABASE_URL: envPrimitives.url,
  REDIS_URL: envPrimitives.url,
  JWT_SECRET: envPrimitives.nonEmptyString,
  JWT_EXPIRES_IN: z.string().default("7d"),
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
