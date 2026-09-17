import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { FriendsOverviewResponse } from "@risesolo/validation";

export type FriendsResult =
  | { status: "loading" }
  | { status: "success"; data: FriendsOverviewResponse }
  | { status: "error"; message: string };

/** GET /friends - prijatelji + dolazni/odlazni zahtevi, jedan poziv za ceo ekran. */
export function useFriends(apiClient: ApiClient): { state: FriendsResult; refetch: () => void } {
  const [state, setState] = useState<FriendsResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.friends
      .getOverview()
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
