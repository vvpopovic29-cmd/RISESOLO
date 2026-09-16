import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesOffering, type PurchasesPackage } from "react-native-purchases";
import { getRevenueCatApiKey } from "../config/env";

/**
 * Mora biti IDENTICAN `PRO_ENTITLEMENT_ID` iz `packages/domain/src/subscription/entitlement.ts`
 * (RevenueCat Dashboard -> Entitlements). Ne uvozimo `@risesolo/domain` ovde
 * samo zbog jedne string konstante - mobile paket ga inace ne koristi.
 */
export const PRO_ENTITLEMENT_ID = "pro_access";

/**
 * `react-native-purchases` je nativni modul - stvarne SDK pozive pravimo
 * SAMO na iOS/Android, NIKAD na webu (nema smisla, i EAS dev/production
 * build je jedini nacin da se native kod uopste izvrsi - vidi README "EAS
 * Build"). Bez konfigurisanog RevenueCat API kljuca (Dashboard jos nije
 * podesen), SDK ostaje neinicijalizovan i sve funkcije ispod se ponasaju
 * kao no-op/prazno stanje umesto da bacaju gresku - isti "placeholder-friendly"
 * princip kao AiService na backend-u.
 *
 * VAZNA NAPOMENA: lokalni entitlement iz `CustomerInfo` je SAMO za UX
 * (trenutno otkljucavanje ekrana bez cekanja mreze) - stvarni server-side
 * gate (apps/api/src/training-plans/training-plans.service.ts) uvek pita
 * GET /subscriptions/me, cija istina dolazi iskljucivo iz RevenueCat
 * webhook-a (apps/api/src/subscriptions), nikad iz ovog SDK-a direktno.
 */
let configured = false;

function isPurchasesAvailable(): boolean {
  return Platform.OS !== "web";
}

/** Poziva se JEDNOM po sesiji (nakon login/register) - vezuje RevenueCat app_user_id za nas interni userId. */
export function configurePurchases(userId: string): void {
  if (!isPurchasesAvailable() || configured) {
    return;
  }
  const apiKey = getRevenueCatApiKey(Platform.OS === "ios" ? "ios" : "android");
  if (!apiKey) {
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.WARN).catch(() => undefined);
  }
  Purchases.configure({ apiKey, appUserID: userId });
  configured = true;
}

/** Poziva se na logout - odvezuje RevenueCat identitet od korisnika koji je upravo izasao. */
export async function logOutPurchases(): Promise<void> {
  if (!configured) {
    return;
  }
  await Purchases.logOut().catch(() => undefined);
  configured = false;
}

export function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
}

/** `null` ako SDK nije dostupan/konfigurisan (web, ili Store/RevenueCat Dashboard jos nisu podeseni). */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) {
    return null;
  }
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export interface PurchaseResult {
  success: boolean;
  isPro: boolean;
  /** `null` znaci da je korisnik sam otkazao (nije prava greska - ne prikazuj error banner). */
  errorMessage: string | null;
  userCancelled: boolean;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  if (!configured) {
    return { success: false, isPro: false, errorMessage: "Pretplate trenutno nisu dostupne.", userCancelled: false };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: true, isPro: hasProEntitlement(customerInfo), errorMessage: null, userCancelled: false };
  } catch (error) {
    const purchasesError = error as { userCancelled?: boolean; message?: string };
    if (purchasesError.userCancelled) {
      return { success: false, isPro: false, errorMessage: null, userCancelled: true };
    }
    return {
      success: false,
      isPro: false,
      errorMessage: purchasesError.message ?? "Kupovina nije uspela.",
      userCancelled: false,
    };
  }
}

export interface RestoreResult {
  success: boolean;
  isPro: boolean;
  errorMessage: string | null;
}

export async function restorePurchases(): Promise<RestoreResult> {
  if (!configured) {
    return { success: false, isPro: false, errorMessage: "Pretplate trenutno nisu dostupne." };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, isPro: hasProEntitlement(customerInfo), errorMessage: null };
  } catch (error) {
    const purchasesError = error as { message?: string };
    return { success: false, isPro: false, errorMessage: purchasesError.message ?? "Obnova kupovina nije uspela." };
  }
}

/** Vraca unsubscribe funkciju. Poziva se svaki put kada RevenueCat lokalno osvezi CustomerInfo (obnova/otkazivanje/istek). */
export function addProEntitlementListener(onChange: (isPro: boolean) => void): () => void {
  if (!configured) {
    return () => undefined;
  }
  const listener = (customerInfo: CustomerInfo) => onChange(hasProEntitlement(customerInfo));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
