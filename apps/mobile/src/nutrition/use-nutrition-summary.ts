import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { NutritionDailySummary } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type NutritionSummaryState =
  | { status: "loading" }
  | { status: "success"; data: NutritionDailySummary }
  | { status: "error"; message: string };

export function useNutritionSummary(): { state: NutritionSummaryState; refetch: () => void } {
  const apiClient = useApiClient();
  const [state, setState] = useState<NutritionSummaryState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .getNutritionSummary()
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
