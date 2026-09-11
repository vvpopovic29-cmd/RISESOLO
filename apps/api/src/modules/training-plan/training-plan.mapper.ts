import type { TrainingPlanResponse } from "@risesolo/validation";
import type { TrainingPlanRow } from "./training-plan.types";

/** `row` je null kada igrac jos nije postavio training plan - sva polja su tada null. */
export function mapTrainingPlanRowToResponse(row: TrainingPlanRow | null): TrainingPlanResponse {
  return {
    splitType: row?.split_type ?? null,
    daysPerWeek: row?.days_per_week ?? null,
    schedule: row?.schedule ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}
