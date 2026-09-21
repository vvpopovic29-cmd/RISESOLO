import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { InventoryItemDto } from "@risesolo/validation";

export type CustomItemsResult =
  | { status: "loading" }
  | { status: "success"; data: InventoryItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/custom - za razliku od svih ostalih izvora NEMA fiksan katalog, samo ono sto je igrac SAM napravio (vidi InventoryService.listCustomItems). */
export function useCustomItems(apiClient: ApiClient): { state: CustomItemsResult; refetch: () => void } {
  const [state, setState] = useState<CustomItemsResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory.custom
      .list()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
