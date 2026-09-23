import {
  createWorkoutTemplateRequestSchema,
  workoutTemplateDetailSchema,
  workoutTemplateSummarySchema,
  z,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, noContentResponse, registry } from "../registry";

export function registerWorkoutTemplatesPaths(): void {
  const CreateWorkoutTemplateRequest = registry.register("CreateWorkoutTemplateRequest", createWorkoutTemplateRequestSchema);
  const WorkoutTemplateDetail = registry.register("WorkoutTemplateDetail", workoutTemplateDetailSchema);
  const WorkoutTemplateSummaryList = registry.register("WorkoutTemplateSummaryList", z.array(workoutTemplateSummarySchema));
  const templateIdParam = z.object({ id: z.string() });

  registry.registerPath({
    method: "post",
    path: "/workouts/templates",
    tags: ["Workout Templates"],
    summary: "Kreiraj sopstveni trening template",
    security: AUTH_SECURITY,
    request: { body: jsonBody(CreateWorkoutTemplateRequest) },
    responses: {
      201: jsonResponse(WorkoutTemplateDetail),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/workouts/templates",
    tags: ["Workout Templates"],
    summary: "Lista mojih trening template-a",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(WorkoutTemplateSummaryList),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/workouts/templates/{id}",
    tags: ["Workout Templates"],
    summary: "Detalji jednog trening template-a",
    security: AUTH_SECURITY,
    request: { params: templateIdParam },
    responses: {
      200: jsonResponse(WorkoutTemplateDetail),
      404: { description: "Template ne postoji ili ne pripada korisniku" },
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/workouts/templates/{id}",
    tags: ["Workout Templates"],
    summary: "Obriši trening template",
    security: AUTH_SECURITY,
    request: { params: templateIdParam },
    responses: {
      204: noContentResponse,
      ...AUTH_RESPONSES,
    },
  });
}
