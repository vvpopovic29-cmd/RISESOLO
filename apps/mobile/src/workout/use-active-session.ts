import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { ActiveWorkoutSessionResponse } from "@risesolo/validation";

export type ActiveSessionResult =
  | { status: "loading" }
  | { status: "success"; data: ActiveWorkoutSessionResponse }
  | { status: "error"; message: string };

/** GET /workouts/sessions/active - korisnikov pauzirani (IN_PROGRESS) trening, ako postoji. */
export function useActiveSession(apiClient: ApiClient): { state: ActiveSessionResult; refetch: () => void } {
  const [state, setState] = useState<ActiveSessionResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.workouts
      .getActiveSession()
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
