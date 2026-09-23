import {
  activeWorkoutSessionSchema,
  completeWorkoutResponseSchema,
  logSetRequestSchema,
  startWorkoutSessionRequestSchema,
  workoutSessionSchema,
  z,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, noContentResponse, registry } from "../registry";

export function registerWorkoutsPaths(): void {
  const StartWorkoutSessionRequest = registry.register("StartWorkoutSessionRequest", startWorkoutSessionRequestSchema);
  const WorkoutSession = registry.register("WorkoutSession", workoutSessionSchema);
  const LogSetRequest = registry.register("LogSetRequest", logSetRequestSchema);
  const CompleteWorkoutResponse = registry.register("CompleteWorkoutResponse", completeWorkoutResponseSchema);
  const ActiveWorkoutSessionResponse = registry.register("ActiveWorkoutSessionResponse", activeWorkoutSessionSchema);
  const sessionIdParam = z.object({ id: z.string() });

  registry.registerPath({
    method: "post",
    path: "/workouts/sessions",
    tags: ["Workouts"],
    summary: "Otpočni novu trening sesiju",
    security: AUTH_SECURITY,
    request: { body: jsonBody(StartWorkoutSessionRequest) },
    responses: {
      201: jsonResponse(WorkoutSession),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/workouts/sessions/{id}/sets",
    tags: ["Workouts"],
    summary: "Zabeleži seriju (set) u aktivnoj sesiji",
    security: AUTH_SECURITY,
    request: { params: sessionIdParam, body: jsonBody(LogSetRequest) },
    responses: {
      204: noContentResponse,
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/workouts/sessions/{id}/complete",
    tags: ["Workouts"],
    summary: "Završi trening sesiju (XP/Level/Reward/Streak/Quest pipeline)",
    security: AUTH_SECURITY,
    request: { params: sessionIdParam },
    responses: {
      200: jsonResponse(CompleteWorkoutResponse),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/workouts/sessions/active",
    tags: ["Workouts"],
    summary: "Trenutno aktivna (ili pauzirana) trening sesija, ako postoji",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(ActiveWorkoutSessionResponse),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/workouts/sessions/{id}/abandon",
    tags: ["Workouts"],
    summary: "Napusti (otkaži) trening sesiju bez završavanja",
    security: AUTH_SECURITY,
    request: { params: sessionIdParam },
    responses: {
      204: noContentResponse,
      ...AUTH_RESPONSES,
    },
  });
}
