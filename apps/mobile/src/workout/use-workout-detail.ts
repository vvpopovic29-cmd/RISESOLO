import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { WorkoutResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type WorkoutDetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: WorkoutResponse }
  | { status: "error"; message: string };

/** `workoutId` je null dok korisnik jos nije izabrao trening iz istorije - tada je stanje "idle". */
export function useWorkoutDetail(workoutId: string | null): {
  state: WorkoutDetailState;
  refetch: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<WorkoutDetailState>({ status: "idle" });

  const refetch = useCallback(() => {
    if (!workoutId) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    apiClient
      .getWorkout(workoutId)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient, workoutId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
