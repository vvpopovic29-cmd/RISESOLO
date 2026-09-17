import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { FriendsLeaderboardResponseDto } from "@risesolo/validation";

export type FriendsLeaderboardResult =
  | { status: "loading" }
  | { status: "success"; data: FriendsLeaderboardResponseDto }
  | { status: "error"; message: string };

/** GET /friends/leaderboard - "Rivali": live leaderboard ogranicen na mene + prihvacene prijatelje. */
export function useFriendsLeaderboard(apiClient: ApiClient): { state: FriendsLeaderboardResult; refetch: () => void } {
  const [state, setState] = useState<FriendsLeaderboardResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.friends
      .getLeaderboard()
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
