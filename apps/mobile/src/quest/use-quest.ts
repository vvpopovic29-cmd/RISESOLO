import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { QuestLinkedAction, QuestResponse, QuestType } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type QuestCardState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "success"; data: QuestResponse }
  | { status: "error"; message: string };

/**
 * Generalizovana verzija `useDailyQuest` - ucitava aktivan quest za dati
 * (type, linkedAction) par i izlaze `generate()` koji poziva prosledjenu
 * api-client metodu (`generateWeeklyQuest`/`generateSideQuest`, itd).
 * `useDailyQuest` ostaje odvojen (vec stabilan i testiran) - ovaj hook
 * pokriva nove quest tipove bez diranja postojeceg.
 */
export function useQuest(
  type: QuestType,
  linkedAction: QuestLinkedAction,
  generate: (apiClient: ApiClient) => Promise<QuestResponse>,
): {
  state: QuestCardState;
  refetch: () => void;
  generate: () => void;
  generating: boolean;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<QuestCardState>({ status: "loading" });
  const [generating, setGenerating] = useState(false);

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .listQuests("active")
      .then((quests) => {
        const match = quests.find(
          (quest) => quest.type === type && quest.linkedAction === linkedAction,
        );
        setState(match ? { status: "success", data: match } : { status: "empty" });
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient, type, linkedAction]);

  const generateQuest = useCallback(() => {
    setGenerating(true);
    generate(apiClient)
      .then((quest) => setState({ status: "success", data: quest }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      })
      .finally(() => setGenerating(false));
  }, [apiClient, generate]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch, generate: generateQuest, generating };
}
