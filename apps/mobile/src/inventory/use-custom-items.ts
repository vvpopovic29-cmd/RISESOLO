import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { InventoryItemDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type CustomItemsResult =
  | { status: "loading" }
  | { status: "success"; data: InventoryItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/custom - za razliku od svih ostalih izvora NEMA fiksan katalog, samo ono sto je igrac SAM napravio (vidi InventoryService.listCustomItems). */
export function useCustomItems(apiClient: ApiClient): { state: CustomItemsResult; refetch: () => void } {
  const [state, setState] = useState<CustomItemsResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory.custom
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
