import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { ExerciseResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type ExercisesState =
  | { status: "loading" }
  | { status: "success"; data: ExerciseResponse[] }
  | { status: "error"; message: string };

export function useExercises(): { state: ExercisesState; refetch: () => void } {
  const apiClient = useApiClient();
  const [state, setState] = useState<ExercisesState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .listExercises()
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
