import type { ExecutionContext } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ThrottlerException, ThrottlerGuard } from "@nestjs/throttler";

/**
 * `ThrottlerGuard.canActivate()` nema try/catch oko `storageService.increment()`
 * (izvor @nestjs/throttler) - sa Redis-backed storage-om (vidi app.module.ts)
 * to bi znacilo da nedostupnost Redis-a obara SVAKI zahtev, jer je guard
 * globalan preko APP_GUARD. Rate limiting je bezbednosna mera, ne kriticna
 * funkcionalnost - zato fail-open: bilo sta osim ThrottlerException se hvata
 * i zahtev prolazi bez limita, umesto 500 greske (isti "placeholder-friendly"
 * princip kao Expo push/Sentry/AI - vidi README "Rate Limiting & Monitoring").
 */
@Injectable()
export class ResilientThrottlerGuard extends ThrottlerGuard {
  private readonly resilientLogger = new Logger(ResilientThrottlerGuard.name);

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch (error) {
      if (error instanceof ThrottlerException) {
        throw error;
      }
      this.resilientLogger.warn(
        `Rate limit storage nedostupan, zahtev propusten bez limita: ${error instanceof Error ? error.message : error}`,
      );
      return true;
    }
  }
}
