import { useMemo } from "react";
import { createApiClient, type ApiClient } from "@risesolo/api-client";
import { useAuth } from "../auth/AuthProvider";
import { getApiBaseUrl } from "../config/env";

/** API klijent vezan za trenutnu Supabase Auth sesiju - svaki zahtev automatski nosi access token. */
export function useApiClient(): ApiClient {
  const { getAccessToken } = useAuth();

  return useMemo(
    () => createApiClient({ baseUrl: getApiBaseUrl(), getAccessToken }),
    [getAccessToken],
  );
}
