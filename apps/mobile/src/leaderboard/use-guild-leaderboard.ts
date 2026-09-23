import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { GuildLeaderboardResponseDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type GuildLeaderboardResult =
  | { status: "loading" }
  | { status: "success"; data: GuildLeaderboardResponseDto }
  | { status: "error"; message: string };

/** GET /leaderboard/guilds - `data.myGuild` je `null` ako korisnik trenutno nije clan nijednog ceha. */
export function useGuildLeaderboard(
  apiClient: ApiClient,
  limit = 50,
): { state: GuildLeaderboardResult; refetch: () => void } {
  const [state, setState] = useState<GuildLeaderboardResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.leaderboard
      .guilds(limit)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : t("common.unknownError");
        setState({ status: "error", message });
      });
  }, [apiClient, limit, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
