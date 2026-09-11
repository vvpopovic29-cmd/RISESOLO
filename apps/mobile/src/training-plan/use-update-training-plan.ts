import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { TrainingPlanResponse, UpdateTrainingPlanInput } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type UpdateTrainingPlanState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: TrainingPlanResponse }
  | { status: "error"; message: string };

export function useUpdateTrainingPlan(): {
  state: UpdateTrainingPlanState;
  submit: (input: UpdateTrainingPlanInput) => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<UpdateTrainingPlanState>({ status: "idle" });

  const submit = useCallback(
    (input: UpdateTrainingPlanInput) => {
      setState({ status: "submitting" });
      apiClient
        .updateTrainingPlan(input)
        .then((data) => setState({ status: "success", data }))
        .catch((error: unknown) => {
          const message = error instanceof ApiError ? error.message : "Nepoznata greska";
          setState({ status: "error", message });
        });
    },
    [apiClient],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, submit, reset };
}
