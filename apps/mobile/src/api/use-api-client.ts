import { useMemo, useRef } from "react";
import { createApiClient, type ApiClient } from "@risesolo/api-client";
import { getApiBaseUrl } from "../config/env";

/**
 * Kreira JEDAN `ApiClient` po komponenti/kontekstu koji cita trenutni token
 * preko ref-a (izbegava rekreiranje klijenta na svaku promenu tokena, dok
 * `getAccessToken()` uvek vraca sveze stanje - vidi AuthContext.tsx).
 */
export function useApiClient(getAccessToken: () => string | null): ApiClient {
  const getAccessTokenRef = useRef(getAccessToken);
  getAccessTokenRef.current = getAccessToken;

  return useMemo(
    () =>
      createApiClient({
        baseUrl: getApiBaseUrl(),
        getAccessToken: () => getAccessTokenRef.current(),
      }),
    [],
  );
}
