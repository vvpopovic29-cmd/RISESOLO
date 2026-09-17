import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { WorkoutHistoryEntryDto } from "@risesolo/validation";

export type WorkoutHistoryResult =
  | { status: "loading" }
  | { status: "success"; data: WorkoutHistoryEntryDto[] }
  | { status: "error"; message: string };

/** GET /workouts/history - poslednji zavrseni treninzi, najnoviji prvi. */
export function useWorkoutHistory(
  apiClient: ApiClient,
  limit = 20,
): { state: WorkoutHistoryResult; refetch: () => void } {
  const [state, setState] = useState<WorkoutHistoryResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.workouts
      .history(limit)
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
