import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { ExerciseProgressResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type ExerciseProgressState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ExerciseProgressResponse }
  | { status: "error"; message: string };

/** `exerciseId` je null dok korisnik jos nije izabrao vezbu - tada je stanje "idle". */
export function useExerciseProgress(exerciseId: string | null): {
  state: ExerciseProgressState;
  refetch: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<ExerciseProgressState>({ status: "idle" });

  const refetch = useCallback(() => {
    if (!exerciseId) {
      setState({ status: "idle" });
      return;
    }
    setState({ status: "loading" });
    apiClient
      .getExerciseProgress(exerciseId)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient, exerciseId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
