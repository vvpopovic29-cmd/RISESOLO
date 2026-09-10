import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { LogWorkoutInput, LogWorkoutResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type LogWorkoutState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: LogWorkoutResponse }
  | { status: "error"; message: string };

export function useLogWorkout(): {
  state: LogWorkoutState;
  submit: (input: LogWorkoutInput) => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<LogWorkoutState>({ status: "idle" });

  const submit = useCallback(
    (input: LogWorkoutInput) => {
      setState({ status: "submitting" });
      apiClient
        .logWorkout(input)
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
