import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { SubscriptionStatusDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type SubscriptionStatusResult =
  | { status: "loading" }
  | { status: "success"; data: SubscriptionStatusDto }
  | { status: "error"; message: string };

/**
 * GET /subscriptions/me - server-authoritative izvor istine za `isPro`
 * (RevenueCat webhook je jedini nacin da se promeni, vidi
 * apps/api/src/subscriptions). Lokalni RevenueCat SDK entitlement
 * (src/subscriptions/purchases.ts) je samo za trenutni UX odziv posle
 * kupovine, ne zamenjuje ovaj poziv.
 */
export function useSubscriptionStatus(apiClient: ApiClient): { state: SubscriptionStatusResult; refetch: () => void } {
  const [state, setState] = useState<SubscriptionStatusResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.subscriptions
      .getStatus()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : t("common.unknownError");
        setState({ status: "error", message });
      });
  }, [apiClient, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
