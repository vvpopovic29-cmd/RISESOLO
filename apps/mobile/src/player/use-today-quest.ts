import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { DailyQuestDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type TodayQuestResult =
  | { status: "loading" }
  | { status: "success"; data: DailyQuestDto }
  | { status: "error"; message: string };

/** GET /quests/today - idempotentan (generise quest ako ne postoji za danas), samo prikazuje stanje. */
export function useTodayQuest(apiClient: ApiClient, enabled = true): { state: TodayQuestResult; refetch: () => void } {
  const [state, setState] = useState<TodayQuestResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .today()
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
