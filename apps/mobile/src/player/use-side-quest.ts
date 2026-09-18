import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { SideQuestDto } from "@risesolo/validation";

export type SideQuestResult =
  | { status: "loading" }
  | { status: "success"; data: SideQuestDto | null }
  | { status: "error"; message: string };

/**
 * GET /quests/side - READ-ONLY (nikad ne zavrsava quest, za razliku od
 * useWeeklyQuest/useMainQuest - vidi QuestsService.getCurrentSideQuest).
 * `data: null` znaci da je korisnik iscrpeo biblioteku vezbi.
 */
export function useSideQuest(apiClient: ApiClient, enabled = true): { state: SideQuestResult; refetch: () => void } {
  const [state, setState] = useState<SideQuestResult>({ status: "loading" });

  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.quests
      .side()
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
