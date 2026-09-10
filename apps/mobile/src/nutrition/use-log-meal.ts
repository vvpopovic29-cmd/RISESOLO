import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { LogMealInput, MealLogResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type LogMealState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: MealLogResponse }
  | { status: "error"; message: string };

export function useLogMeal(): {
  state: LogMealState;
  submit: (input: LogMealInput) => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<LogMealState>({ status: "idle" });

  const submit = useCallback(
    (input: LogMealInput) => {
      setState({ status: "submitting" });
      apiClient
        .logMeal(input)
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
