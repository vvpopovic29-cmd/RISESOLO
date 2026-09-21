import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { captureException } from "../sentry";

/**
 * "Catch everything" filter (isti obrazac kao NestJS dokumentacija) -
 * delegira na BaseExceptionFilter za stvarni HTTP odgovor (identicno
 * ponasanje kao bez ovog filtera - NIKAD ne menja status kod/telo odgovora),
 * ali usput prijavljuje Sentry-ju (no-op ako SENTRY_DSN nije konfigurisan,
 * vidi common/sentry.ts) samo NEOCEKIVANE greske - 5xx ili bilo sta sto
 * NIJE HttpException. Ocekivane 4xx greske (validacija, 404, 403...) su
 * normalan tok kontrole, ne incident - njihovo prijavljivanje bi samo
 * pravilo sum u Sentry dashboard-u.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException) || exception.getStatus() >= 500) {
      captureException(exception);
    }
    super.catch(exception, host);
  }
}
