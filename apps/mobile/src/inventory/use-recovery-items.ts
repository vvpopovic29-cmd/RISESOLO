import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { InventoryItemDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type RecoveryItemsResult =
  | { status: "loading" }
  | { status: "success"; data: InventoryItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/recovery - unapred vidljiv katalog kao Guild, automatski se dodeljuje na osnovu licnog obrasca odmora izmedju treninga (vidi InventoryService.evaluateAndDiscoverRecovery). */
export function useRecoveryItems(apiClient: ApiClient): { state: RecoveryItemsResult; refetch: () => void } {
  const [state, setState] = useState<RecoveryItemsResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory
      .recovery()
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
