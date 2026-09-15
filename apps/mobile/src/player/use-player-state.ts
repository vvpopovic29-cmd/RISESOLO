import { useCallback, useEffect, useState } from "react";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { PlayerStateDto } from "@risesolo/validation";

export type PlayerStateResult =
  | { status: "loading" }
  | { status: "success"; data: PlayerStateDto }
  | { status: "error"; message: string };

/**
 * GET /players/me - jedini izvor za Level/XP/Rank/Stats na klijentu. Sve
 * vrednosti su server-authoritative (vidi @risesolo/domain), ovaj hook ih
 * samo cita i prikazuje (loading/success/error obrazac - Arhitektonsko
 * pravilo #6).
 */
export function usePlayerState(
  apiClient: ApiClient,
  enabled = true,
): { state: PlayerStateResult; refetch: () => void } {
  const [state, setState] = useState<PlayerStateResult>({ status: "loading" });

  const refetch = useCallback(() => {
    if (!enabled) return;
    setState({ status: "loading" });
    apiClient.players
      .getMe()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { state, refetch };
}
