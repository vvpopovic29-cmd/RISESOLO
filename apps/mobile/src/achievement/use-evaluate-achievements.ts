import { useCallback, useState } from "react";
import { ApiError } from "@risesolo/api-client";
import type { AchievementResponse } from "@risesolo/validation";
import { useApiClient } from "../api/use-api-client";

export type EvaluateAchievementsState =
  | { status: "idle" }
  | { status: "evaluating" }
  | { status: "success"; data: AchievementResponse[] }
  | { status: "error"; message: string };

/**
 * Pokrece proveru achievement-a (npr. posle uspesnog logWorkout-a) i vraca
 * samo novootkljucane. Ne baca gresku dalje na poziv koji je izazvao proveru
 * - achievement provera je "best effort" prateca radnja, ne sme da pokvari
 * primarni tok (npr. prikaz PR/XP rezultata treninga).
 */
export function useEvaluateAchievements(): {
  state: EvaluateAchievementsState;
  evaluate: () => void;
  reset: () => void;
} {
  const apiClient = useApiClient();
  const [state, setState] = useState<EvaluateAchievementsState>({ status: "idle" });

  const evaluate = useCallback(() => {
    setState({ status: "evaluating" });
    apiClient
      .evaluateAchievements()
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : "Nepoznata greska";
        setState({ status: "error", message });
      });
  }, [apiClient]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, evaluate, reset };
}
