import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { AiQuestDto } from "@risesolo/validation";

export type AiQuestResult =
  | { status: "loading" }
  | { status: "success"; data: AiQuestDto | null }
  | { status: "error"; message: string };

/**
 * GET /quests/ai - READ-ONLY (nikad ne generise samostalno, za razliku od
 * useWeeklyQuest/useMainQuest - vidi QuestsService.getCurrentAiQuest).
 * `data: null` je normalno stanje za besplatne korisnike (AI Quest je
 * Pro-gated) i za dane kada AI servis nije dostupan (graceful degradation).
 */
export function useAiQuest(apiClient: ApiClient, enabled = true): { state: AiQuestResult; refetch: () => void } {
  const [state, setState] = useState<AiQuestResult>({ status: "loading" });

  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .ai()
      .then((response) => setState({ status: "success", data: response.quest }))
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
