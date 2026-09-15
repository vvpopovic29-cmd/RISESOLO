import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { DailyQuestDto } from "@risesolo/validation";

export type TodayQuestResult =
  | { status: "loading" }
  | { status: "success"; data: DailyQuestDto }
  | { status: "error"; message: string };

/** GET /quests/today - idempotentan (generise quest ako ne postoji za danas), samo prikazuje stanje. */
export function useTodayQuest(apiClient: ApiClient, enabled = true): { state: TodayQuestResult; refetch: () => void } {
  const [state, setState] = useState<TodayQuestResult>({ status: "loading" });

  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .today()
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
