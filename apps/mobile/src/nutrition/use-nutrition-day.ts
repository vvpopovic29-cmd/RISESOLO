import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { DailyNutritionSummaryDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type NutritionDayResult =
  | { status: "loading" }
  | { status: "success"; data: DailyNutritionSummaryDto }
  | { status: "error"; message: string };

/** GET /nutrition/entries - bez date parametra vraca danasnji dan (server-side, UTC). */
export function useNutritionDay(apiClient: ApiClient): { state: NutritionDayResult; refetch: () => void } {
  const [state, setState] = useState<NutritionDayResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.nutrition
      .getDay()
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
