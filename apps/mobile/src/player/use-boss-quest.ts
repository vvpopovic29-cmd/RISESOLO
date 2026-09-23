import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { BossQuestDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type BossQuestResult =
  | { status: "loading" }
  | { status: "success"; data: BossQuestDto }
  | { status: "error"; message: string };

/** GET /quests/boss - idempotentan (generise quest za tekucu ISO nedelju ako ne postoji), samo prikazuje stanje. */
export function useBossQuest(apiClient: ApiClient, enabled = true): { state: BossQuestResult; refetch: () => void } {
  const [state, setState] = useState<BossQuestResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .boss()
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
