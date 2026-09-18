import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { InventoryItemDto } from "@risesolo/validation";

export type GuildItemsResult =
  | { status: "loading" }
  | { status: "success"; data: InventoryItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/guild - server takodje lazy-sustize propustena otkrivanja pre nego sto odgovori (vidi InventoryService.listGuildItems). */
export function useGuildItems(apiClient: ApiClient): { state: GuildItemsResult; refetch: () => void } {
  const [state, setState] = useState<GuildItemsResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory
      .guild()
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
