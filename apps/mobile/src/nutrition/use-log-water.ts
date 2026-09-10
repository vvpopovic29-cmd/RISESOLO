import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { LogWaterInput, WaterLogResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type LogWaterState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: WaterLogResponse }
  | { status: "error"; message: string };

export function useLogWater(): {
  state: LogWaterState;
  submit: (input: LogWaterInput) => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<LogWaterState>({ status: "idle" });

  const submit = useCallback(
    (input: LogWaterInput) => {
      setState({ status: "submitting" });
      apiClient
        .logWater(input)
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
