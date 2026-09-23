import { generateTrainingPlanRequestSchema, trainingPlanDetailSchema, trainingPlanSummarySchema, z } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerTrainingPlansPaths(): void {
  const GenerateTrainingPlanRequest = registry.register("GenerateTrainingPlanRequest", generateTrainingPlanRequestSchema);
  const TrainingPlanDetail = registry.register("TrainingPlanDetail", trainingPlanDetailSchema);
  const TrainingPlanSummaryList = registry.register("TrainingPlanSummaryList", z.array(trainingPlanSummarySchema));

  registry.registerPath({
    method: "post",
    path: "/training-plans/generate",
    tags: ["Training Plans"],
    summary: "Generiši novi AI trening plan",
    description: "Zahteva ANTHROPIC_API_KEY na serveru (inače 503) i pro_access ili preostali free limit (inače 403).",
    security: AUTH_SECURITY,
    request: { body: jsonBody(GenerateTrainingPlanRequest) },
    responses: {
      201: jsonResponse(TrainingPlanDetail),
      400: badRequestResponse,
      403: { description: "Free limit iskorišćen - potrebna pro pretplata" },
      503: { description: "AI planovi nisu konfigurisani (nedostaje ANTHROPIC_API_KEY)" },
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/training-plans",
    tags: ["Training Plans"],
    summary: "Lista mojih trening planova",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(TrainingPlanSummaryList),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/training-plans/{id}",
    tags: ["Training Plans"],
    summary: "Detalji jednog trening plana",
    security: AUTH_SECURITY,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: jsonResponse(TrainingPlanDetail),
      404: { description: "Plan ne postoji ili ne pripada korisniku" },
      ...AUTH_RESPONSES,
    },
  });
}
