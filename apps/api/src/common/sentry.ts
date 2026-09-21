import * as Sentry from "@sentry/node";

/**
 * `SENTRY_DSN` je opciono (vidi config/env.ts) - bez njega Sentry.init()
 * se NIKAD ne poziva, isti "placeholder-friendly" princip kao AiService
 * (ANTHROPIC_API_KEY) i RevenueCat webhook (REVENUECAT_WEBHOOK_AUTH_HEADER).
 * `configured` je jedini izvor istine za da li je Sentry aktivan - koristi
 * ga filters/sentry-exception.filter.ts da odluci da li da prijavi izuzetak.
 */
let configured = false;

export function initSentry(dsn: string | undefined, environment: string): void {
  if (!dsn) {
    return;
  }
  Sentry.init({ dsn, environment });
  configured = true;
}

export function isSentryConfigured(): boolean {
  return configured;
}

export function captureException(exception: unknown): void {
  if (!configured) {
    return;
  }
  Sentry.captureException(exception);
}
