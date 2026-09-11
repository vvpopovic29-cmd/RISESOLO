import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { AchievementResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type AchievementsState =
  | { status: "loading" }
  | { status: "success"; data: AchievementResponse[] }
  | { status: "error"; message: string };

export function useAchievements(): { state: AchievementsState; refetch: () => void } {
  const apiClient = useApiClient();
  const [state, setState] = useState<AchievementsState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .listAchievements()
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
