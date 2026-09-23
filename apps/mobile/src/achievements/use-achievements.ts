import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { AchievementDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type AchievementsResult =
  | { status: "loading" }
  | { status: "success"; data: AchievementDto[] }
  | { status: "error"; message: string };

/** GET /achievements - server takodje lazy-sustize propustene unlock-ove pre nego sto odgovori (vidi AchievementsService.listForUser). */
export function useAchievements(apiClient: ApiClient): { state: AchievementsResult; refetch: () => void } {
  const [state, setState] = useState<AchievementsResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.achievements
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
