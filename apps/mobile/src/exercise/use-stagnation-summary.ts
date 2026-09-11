import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { StagnationSummaryResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type StagnationSummaryState =
  | { status: "loading" }
  | { status: "success"; data: StagnationSummaryResponse }
  | { status: "error"; message: string };

/**
 * Faza 15: proaktivan System AI signal na home ekranu - do sada je
 * `stagnationStatus` postojao samo po-vezbi na Progressive Overload ekranu,
 * korisnik je morao sam da ga otvori da bi video da li neka vezba stagnira.
 * Faza 16 dodaje `regressingExercises`/`deloadRecommended` u isti odgovor.
 */
export function useStagnationSummary(): {
  state: StagnationSummaryState;
  refetch: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<StagnationSummaryState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient
      .getStagnationSummary()
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
