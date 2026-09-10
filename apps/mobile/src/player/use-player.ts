import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { PlayerResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type PlayerState =
  | { status: "loading" }
  | { status: "success"; data: PlayerResponse }
  | { status: "error"; message: string };

export function usePlayer(): { state: PlayerState; refetch: () => void } {
  const apiClient = useApiClient();
  const [state, setState] = useState<PlayerState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .getPlayer()
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
