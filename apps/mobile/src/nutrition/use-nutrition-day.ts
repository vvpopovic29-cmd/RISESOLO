import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { DailyNutritionSummaryDto } from "@risesolo/validation";

export type NutritionDayResult =
  | { status: "loading" }
  | { status: "success"; data: DailyNutritionSummaryDto }
  | { status: "error"; message: string };

/** GET /nutrition/entries - bez date parametra vraca danasnji dan (server-side, UTC). */
export function useNutritionDay(apiClient: ApiClient): { state: NutritionDayResult; refetch: () => void } {
  const [state, setState] = useState<NutritionDayResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.nutrition
      .getDay()
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
