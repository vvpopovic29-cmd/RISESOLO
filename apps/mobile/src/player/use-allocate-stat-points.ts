import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { AllocateStatPointsInput, PlayerResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type AllocateStatPointsState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; data: PlayerResponse }
  | { status: "error"; message: string };

export function useAllocateStatPoints(): {
  state: AllocateStatPointsState;
  submit: (input: AllocateStatPointsInput) => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<AllocateStatPointsState>({ status: "idle" });

  const submit = useCallback(
    (input: AllocateStatPointsInput) => {
      setState({ status: "submitting" });
      apiClient
        .allocateStatPoints(input)
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
