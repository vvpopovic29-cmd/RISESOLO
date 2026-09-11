import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { WorkoutResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type WorkoutsState =
  | { status: "loading" }
  | { status: "success"; data: WorkoutResponse[] }
  | { status: "error"; message: string };

export function useWorkouts(): { state: WorkoutsState; refetch: () => void } {
  const apiClient = useApiClient();
  const [state, setState] = useState<WorkoutsState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .listWorkouts()
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
