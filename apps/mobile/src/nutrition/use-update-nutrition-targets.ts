import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { NutritionTargets, UpdateNutritionTargetsInput } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type UpdateNutritionTargetsState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: NutritionTargets }
  | { status: "error"; message: string };

export function useUpdateNutritionTargets(): {
  state: UpdateNutritionTargetsState;
  submit: (input: UpdateNutritionTargetsInput) => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<UpdateNutritionTargetsState>({ status: "idle" });

  const submit = useCallback(
    (input: UpdateNutritionTargetsInput) => {
      setState({ status: "submitting" });
      apiClient
        .updateNutritionTargets(input)
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
