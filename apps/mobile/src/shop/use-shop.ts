import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { ShopItemDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type ShopResult =
  | { status: "loading" }
  | { status: "success"; data: ShopItemDto[] }
  | { status: "error"; message: string };

/** GET /shop - ceo katalog (owned/equipped flagovi vec izracunati na serveru). */
export function useShop(apiClient: ApiClient): { state: ShopResult; refetch: () => void } {
  const [state, setState] = useState<ShopResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.shop
      .list()
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
