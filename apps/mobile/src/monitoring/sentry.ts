import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import { getSentryDsn } from "../config/env";

/**
 * `@sentry/react-native` je delimicno nativni modul - stvarne SDK pozive
 * pravimo SAMO na iOS/Android, NIKAD na webu (isti princip kao
 * PurchasesService, vidi src/subscriptions/purchases.ts). Bez konfigurisanog
 * `EXPO_PUBLIC_SENTRY_DSN` (Sentry projekat jos nije napravljen), SDK ostaje
 * neinicijalizovan i captureException je no-op umesto da baca gresku - isti
 * "placeholder-friendly" princip kao svuda u ovom repou.
 */
let configured = false;

function isSentryAvailable(): boolean {
  return Platform.OS !== "web";
}

/** Poziva se JEDNOM pri startu app-a (root layout). */
export function initSentry(): void {
  if (!isSentryAvailable() || configured) {
    return;
  }
  const dsn = getSentryDsn();
  if (!dsn) {
    return;
  }
  Sentry.init({ dsn });
  configured = true;
}

export function isSentryInitialized(): boolean {
  return configured;
}

/** Rucno prijavljivanje uhvacenog izuzetka (npr. try/catch oko mrezne akcije koja ne sme da rusi ekran). */
export function captureException(exception: unknown): void {
  if (!configured) {
    return;
  }
  Sentry.captureException(exception);
}
