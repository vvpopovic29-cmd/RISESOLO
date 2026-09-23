import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { GuildDetailDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type GuildResult =
  | { status: "loading" }
  | { status: "none" }
  | { status: "success"; data: GuildDetailDto }
  | { status: "error"; message: string };

/**
 * GET /guilds/me - 404 (korisnik nije clan nijednog ceha) je ocekivano
 * stanje, ne greska - prikazuje se create/join UI umesto ErrorState-a.
 */
export function useGuild(apiClient: ApiClient): { state: GuildResult; refetch: () => void } {
  const [state, setState] = useState<GuildResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.guilds
      .getMine()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          setState({ status: "none" });
          return;
        }
        const message = error instanceof ApiError ? error.message : t("common.unknownError");
        setState({ status: "error", message });
      });
  }, [apiClient, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
