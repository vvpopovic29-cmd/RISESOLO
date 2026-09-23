import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { PenaltyQuestDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type PenaltyQuestResult =
  | { status: "loading" }
  | { status: "success"; data: PenaltyQuestDto | null }
  | { status: "error"; message: string };

/**
 * GET /quests/penalty - READ-ONLY (nikad ne zavrsava quest, za razliku od
 * useWeeklyQuest/useMainQuest - vidi QuestsService.getCurrentPenaltyQuest).
 * `data: null` je NORMALNO/najcesce stanje - Penalty Quest postoji samo kada
 * je Penalty System danas stvarno primenio kaznu.
 */
export function usePenaltyQuest(apiClient: ApiClient, enabled = true): { state: PenaltyQuestResult; refetch: () => void } {
  const [state, setState] = useState<PenaltyQuestResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .penalty()
      .then((response) => setState({ status: "success", data: response.quest }))
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
