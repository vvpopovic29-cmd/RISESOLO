import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { PersonalRecordDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type PersonalRecordsResult =
  | { status: "loading" }
  | { status: "success"; data: PersonalRecordDto[] }
  | { status: "error"; message: string };

/** GET /workouts/personal-records - najbolja ikad ulogovana serija po vezbi. */
export function usePersonalRecords(apiClient: ApiClient): { state: PersonalRecordsResult; refetch: () => void } {
  const [state, setState] = useState<PersonalRecordsResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.workouts
      .personalRecords()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : t("common.unknownError");
        setState({ status: "error", message });
      });
  }, [apiClient, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
