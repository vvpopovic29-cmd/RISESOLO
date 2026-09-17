import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { MainQuestDto } from "@risesolo/validation";

export type MainQuestResult =
  | { status: "loading" }
  | { status: "success"; data: MainQuestDto }
  | { status: "error"; message: string };

/** GET /quests/main - idempotentan (generise sledeci quest u lancu ako trenutni ne postoji/je zavrsen), samo prikazuje stanje. */
export function useMainQuest(apiClient: ApiClient, enabled = true): { state: MainQuestResult; refetch: () => void } {
  const [state, setState] = useState<MainQuestResult>({ status: "loading" });

  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .main()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
