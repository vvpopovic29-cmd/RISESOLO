import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { PersonalRecordDto } from "@risesolo/validation";

export type PersonalRecordsResult =
  | { status: "loading" }
  | { status: "success"; data: PersonalRecordDto[] }
  | { status: "error"; message: string };

/** GET /workouts/personal-records - najbolja ikad ulogovana serija po vezbi. */
export function usePersonalRecords(apiClient: ApiClient): { state: PersonalRecordsResult; refetch: () => void } {
  const [state, setState] = useState<PersonalRecordsResult>({ status: "loading" });

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.workouts
      .personalRecords()
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
