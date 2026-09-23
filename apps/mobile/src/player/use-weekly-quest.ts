import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { WeeklyQuestDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type WeeklyQuestResult =
  | { status: "loading" }
  | { status: "success"; data: WeeklyQuestDto }
  | { status: "error"; message: string };

/** GET /quests/weekly - idempotentan (generise quest za tekucu ISO nedelju ako ne postoji), samo prikazuje stanje. */
export function useWeeklyQuest(apiClient: ApiClient, enabled = true): { state: WeeklyQuestResult; refetch: () => void } {
  const [state, setState] = useState<WeeklyQuestResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .weekly()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : t("common.unknownError");
        setState({ status: "error", message });
      });
  }, [apiClient, enabled, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
