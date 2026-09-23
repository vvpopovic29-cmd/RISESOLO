import {
  createNutritionEntryRequestSchema,
  dailyNutritionSummarySchema,
  getNutritionDayQuerySchema,
  nutritionEntrySchema,
  z,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, noContentResponse, registry } from "../registry";

export function registerNutritionPaths(): void {
  const CreateNutritionEntryRequest = registry.register("CreateNutritionEntryRequest", createNutritionEntryRequestSchema);
  const NutritionEntry = registry.register("NutritionEntry", nutritionEntrySchema);
  const GetNutritionDayQuery = registry.register("GetNutritionDayQuery", getNutritionDayQuerySchema);
  const DailyNutritionSummary = registry.register("DailyNutritionSummary", dailyNutritionSummarySchema);

  registry.registerPath({
    method: "post",
    path: "/nutrition/entries",
    tags: ["Nutrition"],
    summary: "Dodaj unos obroka",
    security: AUTH_SECURITY,
    request: { body: jsonBody(CreateNutritionEntryRequest) },
    responses: {
      201: jsonResponse(NutritionEntry),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/nutrition/entries",
    tags: ["Nutrition"],
    summary: "Dnevni pregled ishrane (podrazumevano danas)",
    security: AUTH_SECURITY,
    request: { query: GetNutritionDayQuery },
    responses: {
      200: jsonResponse(DailyNutritionSummary),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/nutrition/entries/{id}",
    tags: ["Nutrition"],
    summary: "Obriši unos obroka",
    security: AUTH_SECURITY,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      204: noContentResponse,
      ...AUTH_RESPONSES,
    },
  });
}
