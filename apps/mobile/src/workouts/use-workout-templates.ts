import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { WorkoutTemplateSummaryDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type WorkoutTemplatesResult =
  | { status: "loading" }
  | { status: "success"; data: WorkoutTemplateSummaryDto[] }
  | { status: "error"; message: string };

/** GET /workouts/templates - lista "Mojih treninga" (sortirano najnoviji prvo, vidi WorkoutTemplatesService.list). */
export function useWorkoutTemplates(apiClient: ApiClient): { state: WorkoutTemplatesResult; refetch: () => void } {
  const [state, setState] = useState<WorkoutTemplatesResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.workouts.templates
      .list()
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
