import { Platform } from "react-native";
import type * as SentryModule from "./sentry";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

const mockGetSentryDsn = jest.fn();
jest.mock("../config/env", () => ({
  getSentryDsn: () => mockGetSentryDsn(),
}));

function loadSentryModule(): typeof SentryModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./sentry") as typeof SentryModule;
}

/**
 * `configured` u sentry.ts je modulski singleton (isti princip kao
 * PurchasesService.configured) - svaki test zato radi `jest.resetModules()`
 * + `require()` da dobije SVEZU instancu modula umesto deljenog stanja.
 */
describe("monitoring/sentry", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: originalOS, configurable: true });
  });

  it("na webu se nikad ne inicijalizuje, cak i sa konfigurisanim DSN-om", () => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    mockGetSentryDsn.mockReturnValue("https://example@sentry.io/1");

    const Sentry = jest.requireMock("@sentry/react-native") as { init: jest.Mock };
    const { initSentry, isSentryInitialized } = loadSentryModule();

    initSentry();
    expect(isSentryInitialized()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("na nativnoj platformi bez DSN-a ostaje neinicijalizovan", () => {
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
    mockGetSentryDsn.mockReturnValue(undefined);

    const Sentry = jest.requireMock("@sentry/react-native") as { init: jest.Mock };
    const { initSentry, isSentryInitialized } = loadSentryModule();

    initSentry();
    expect(isSentryInitialized()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("na nativnoj platformi sa DSN-om inicijalizuje SDK, a captureException posle toga prosledjuje", () => {
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    mockGetSentryDsn.mockReturnValue("https://example@sentry.io/1");

    const Sentry = jest.requireMock("@sentry/react-native") as { init: jest.Mock; captureException: jest.Mock };
    const { initSentry, isSentryInitialized, captureException } = loadSentryModule();

    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith({ dsn: "https://example@sentry.io/1" });
    expect(isSentryInitialized()).toBe(true);

    const error = new Error("greska");
    captureException(error);
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it("captureException je no-op pre inicijalizacije", () => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });

    const Sentry = jest.requireMock("@sentry/react-native") as { captureException: jest.Mock };
    const { captureException } = loadSentryModule();

    captureException(new Error("greska"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
