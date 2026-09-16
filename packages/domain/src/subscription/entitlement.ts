/**
 * Subscriptions/RevenueCat - server-authoritative provera pretplate.
 * RevenueCat webhook (apps/api/src/subscriptions) je jedini izvor istine;
 * ovde definisemo samo cist domain sloj (bez I/O). `expiresAt` je jedino
 * perzistirano polje (isti princip kao total_xp) - "da li je pretplata
 * aktivna" se UVEK izvodi preko `isEntitlementActive`, nikad ne cuva kao
 * poseban boolean koji moze da zaostane iza stvarnog stanja.
 */
export const PRO_ENTITLEMENT_ID = "pro_access";

/** Besplatni korisnik moze da generise najvise ovoliko AI trening planova ukupno. */
export const FREE_TRAINING_PLAN_LIMIT = 1;

export function isEntitlementActive(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && expiresAt.getTime() > now.getTime();
}

export function canGenerateTrainingPlan(existingPlanCount: number, hasProAccess: boolean): boolean {
  return hasProAccess || existingPlanCount < FREE_TRAINING_PLAN_LIMIT;
}
