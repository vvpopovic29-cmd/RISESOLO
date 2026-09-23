import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { InventoryItemDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type InventoryResult =
  | { status: "loading" }
  | { status: "success"; data: InventoryItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory - server takodje lazy-sustize propustena otkrivanja pre nego sto odgovori (vidi InventoryService.listForUser). */
export function useInventory(apiClient: ApiClient): { state: InventoryResult; refetch: () => void } {
  const [state, setState] = useState<InventoryResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory
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
