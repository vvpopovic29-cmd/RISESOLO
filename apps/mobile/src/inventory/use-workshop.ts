import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { WorkshopItemDto } from "@risesolo/validation";

export type WorkshopResult =
  | { status: "loading" }
  | { status: "success"; data: WorkshopItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/workshop - ceo katalog, unapred vidljiv (levelRequirement/coinCost/owned vec izracunati na serveru). */
export function useWorkshop(apiClient: ApiClient): { state: WorkshopResult; refetch: () => void } {
  const [state, setState] = useState<WorkshopResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory.workshop
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
