import { personalRecordSchema, workoutHistoryEntrySchema, workoutHistoryQuerySchema, z } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, jsonResponse, registry } from "../registry";

export function registerWorkoutHistoryPaths(): void {
  const WorkoutHistoryQuery = registry.register("WorkoutHistoryQuery", workoutHistoryQuerySchema);
  const WorkoutHistoryEntryList = registry.register("WorkoutHistoryEntryList", z.array(workoutHistoryEntrySchema));
  const PersonalRecordList = registry.register("PersonalRecordList", z.array(personalRecordSchema));

  registry.registerPath({
    method: "get",
    path: "/workouts/history",
    tags: ["Workout History"],
    summary: "Istorija završenih trening sesija",
    security: AUTH_SECURITY,
    request: { query: WorkoutHistoryQuery },
    responses: {
      200: jsonResponse(WorkoutHistoryEntryList),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/workouts/personal-records",
    tags: ["Workout History"],
    summary: "Lični rekordi po vežbi",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(PersonalRecordList),
      ...AUTH_RESPONSES,
    },
  });
}
