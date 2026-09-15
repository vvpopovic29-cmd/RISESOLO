import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { TrainingPlanSummaryDto } from "@risesolo/validation";

export type TrainingPlansResult =
  | { status: "loading" }
  | { status: "success"; data: TrainingPlanSummaryDto[] }
  | { status: "error"; message: string };

/** GET /training-plans - lista prethodno generisanih planova (najnoviji prvi). */
export function useTrainingPlans(apiClient: ApiClient): { state: TrainingPlansResult; refetch: () => void } {
  const [state, setState] = useState<TrainingPlansResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.trainingPlans
      .list()
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
