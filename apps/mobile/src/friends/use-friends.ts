import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { FriendsOverviewResponse } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type FriendsResult =
  | { status: "loading" }
  | { status: "success"; data: FriendsOverviewResponse }
  | { status: "error"; message: string };

/** GET /friends - prijatelji + dolazni/odlazni zahtevi, jedan poziv za ceo ekran. */
export function useFriends(apiClient: ApiClient): { state: FriendsResult; refetch: () => void } {
  const [state, setState] = useState<FriendsResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.friends
      .getOverview()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : t("common.unknownError");
        setState({ status: "error", message });
      });
  }, [apiClient, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
