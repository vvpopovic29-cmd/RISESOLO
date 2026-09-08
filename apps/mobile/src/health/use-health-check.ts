import { useCallback, useEffect, useState } from "react";
import { ApiError, createApiClient } from "@risesolo/api-client";
import type { HealthResponse } from "@risesolo/validation";
import { getApiBaseUrl } from "../config/env";

export type HealthCheckState =
  | { status: "loading" }
  | { status: "success"; data: HealthResponse }
  | { status: "error"; message: string };

/**
 * Dev-only provera da mobilna app moze da dopre do API-ja. Demonstrira
 * loading/success/error obrazac (Arhitektonsko pravilo #6) na jedinom
 * postojecem endpoint-u u Fazi 1 (nema jos poslovnih mutacija).
 */
export function useHealthCheck(): { state: HealthCheckState; refetch: () => void } {
  const [state, setState] = useState<HealthCheckState>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    createApiClient({ baseUrl: getApiBaseUrl() })
      .getHealth()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
