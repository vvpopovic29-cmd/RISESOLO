import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { TrainingPlanResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type TrainingPlanState =
  | { status: "loading" }
  | { status: "success"; data: TrainingPlanResponse }
  | { status: "error"; message: string };

export function useTrainingPlan(): { state: TrainingPlanState; refetch: () => void } {
  const apiClient = useApiClient();
  const [state, setState] = useState<TrainingPlanState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .getTrainingPlan()
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
