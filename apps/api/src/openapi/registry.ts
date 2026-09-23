import { OpenAPIRegistry, extendZodWithOpenApi, type ResponseConfig, type RouteConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "@risesolo/validation";

/**
 * Mora da se pozove na TAČNO istoj zod instanci na kojoj su izgrađene seme u
 * `packages/validation/src/contracts/*` - zato se `z` uvozi iz
 * `@risesolo/validation` (re-export), a ne direktno iz `zod` paketa.
 */
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

export const AUTH_SECURITY: RouteConfig["security"] = [{ bearerAuth: [] }];

const errorResponseSchema = registry.register(
  "ErrorResponse",
  z.object({
    statusCode: z.number().openapi({ example: 400 }),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string().optional(),
  }),
);

export function jsonBody(schema: z.ZodTypeAny, description = "Telo zahteva"): NonNullable<RouteConfig["request"]>["body"] {
  return { description, required: true, content: { "application/json": { schema } } };
}

export function jsonResponse(schema: z.ZodTypeAny, description = "OK"): ResponseConfig {
  return { description, content: { "application/json": { schema } } };
}

export const noContentResponse: ResponseConfig = { description: "Uspešno, bez sadržaja" };
export const badRequestResponse: ResponseConfig = jsonResponse(errorResponseSchema, "Nevalidan zahtev");
export const unauthorizedResponse: ResponseConfig = jsonResponse(errorResponseSchema, "Nedostaje ili je nevažeći JWT token");

export const AUTH_RESPONSES = { 401: unauthorizedResponse } as const;
