import * as Sentry from "@sentry/node";
import { captureException, initSentry, isSentryConfigured } from "./sentry";

jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

/**
 * `configured` u sentry.ts je modulski singleton (namerno - isti princip
 * kao PurchasesService.configured na mobile-u) - testovi zato GRADE stanje
 * redom (prvo neinicijalizovano, pa inicijalizovano nakon initSentry()
 * poziva sa DSN-om), bez reset-a izmedju testova.
 */
describe("Sentry wrapper", () => {
  it("bez pozvanog initSentry, isSentryConfigured() je false i captureException je no-op", () => {
    expect(isSentryConfigured()).toBe(false);
    captureException(new Error("nesto"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("initSentry(undefined, ...) ostaje neinicijalizovan (bez DSN-a)", () => {
    initSentry(undefined, "development");
    expect(isSentryConfigured()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("initSentry sa DSN-om inicijalizuje Sentry, a captureException posle toga stvarno prosledjuje", () => {
    initSentry("https://example@sentry.io/1", "production");
    expect(Sentry.init).toHaveBeenCalledWith({ dsn: "https://example@sentry.io/1", environment: "production" });
    expect(isSentryConfigured()).toBe(true);

    const error = new Error("neocekivana greska");
    captureException(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });
});
