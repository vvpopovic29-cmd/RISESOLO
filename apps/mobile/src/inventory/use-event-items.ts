import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { EventItemDto } from "@risesolo/validation";
import { useI18n } from "../i18n";

export type EventItemsResult =
  | { status: "loading" }
  | { status: "success"; data: EventItemDto[] }
  | { status: "error"; message: string };

/** GET /inventory/event - ceo katalog, unapred vidljiv (active/owned vec izracunati na serveru na osnovu tekuceg datuma). */
export function useEventItems(apiClient: ApiClient): { state: EventItemsResult; refetch: () => void } {
  const [state, setState] = useState<EventItemsResult>({ status: "loading" });

  const { t } = useI18n();
  const refetch = useCallback(() => {
    setState({ status: "loading" });
    apiClient.inventory.event
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
