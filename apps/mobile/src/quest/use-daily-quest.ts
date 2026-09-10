import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { QuestResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type DailyQuestState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "success"; data: QuestResponse }
  | { status: "error"; message: string };

/**
 * Ucitava aktivan Daily Quest (workout tipa) za danas. Ako ne postoji,
 * stanje je "empty" - korisnik eksplicitno trazi generisanje preko
 * `generate()` umesto da se quest automatski kreira na svaki ucitani ekran.
 */
export function useDailyQuest(): {
  state: DailyQuestState;
  refetch: () => void;
  generate: () => void;
  generating: boolean;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<DailyQuestState>({ status: "loading" });
  const [generating, setGenerating] = useState(false);

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .listQuests("active")
      .then((quests) => {
        const daily = quests.find(
          (quest) => quest.type === "daily" && quest.linkedAction === "workout",
        );
        setState(daily ? { status: "success", data: daily } : { status: "empty" });
      })
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient]);

  const generate = useCallback(() => {
    setGenerating(true);
    apiClient
      .generateDailyQuest()
      .then((quest) => setState({ status: "success", data: quest }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      })
      .finally(() => setGenerating(false));
  }, [apiClient]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch, generate, generating };
}
