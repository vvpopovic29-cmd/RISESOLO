import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { InventoryItemDto } from "@risesolo/validation";

export type AiItemsResult =
  | { status: "loading" }
  | { status: "success"; data: InventoryItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/ai - tajan katalog kao Hidden Item, ali name/description (kad otkriveno) generise Claude po igracu (Pro-gated, vidi InventoryService.evaluateAndDiscoverAi). */
export function useAiItems(apiClient: ApiClient): { state: AiItemsResult; refetch: () => void } {
  const [state, setState] = useState<AiItemsResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory
      .ai()
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
