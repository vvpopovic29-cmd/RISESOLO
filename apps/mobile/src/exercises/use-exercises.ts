import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { ExerciseDto, ListExercisesQuery } from "@risesolo/validation";

export type ExercisesResult =
  | { status: "loading" }
  | { status: "success"; data: ExerciseDto[] }
  | { status: "error"; message: string };

export function useExercises(
  apiClient: ApiClient,
  query: ListExercisesQuery,
): { state: ExercisesResult; refetch: () => void } {
  const [state, setState] = useState<ExercisesResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.exercises
      .list(query)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient, query.category, query.type, query.difficulty]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
