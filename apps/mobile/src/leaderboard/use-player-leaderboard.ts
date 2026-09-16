import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { PlayerLeaderboardResponseDto } from "@risesolo/validation";

export type PlayerLeaderboardResult =
  | { status: "loading" }
  | { status: "success"; data: PlayerLeaderboardResponseDto }
  | { status: "error"; message: string };

/** GET /leaderboard/players - `data.me` je uvek prisutno, cak i van vracene top liste (vidi AchievementsService.listForUser za isti "uvek imamo sopstveni red" princip). */
export function usePlayerLeaderboard(
  apiClient: ApiClient,
  limit = 50,
): { state: PlayerLeaderboardResult; refetch: () => void } {
  const [state, setState] = useState<PlayerLeaderboardResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.leaderboard
      .players(limit)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient, limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
