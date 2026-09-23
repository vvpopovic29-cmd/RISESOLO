import { healthResponseSchema } from "@risesolo/validation";
import { jsonResponse, registry } from "../registry";

export function registerHealthPaths(): void {
  const HealthResponse = registry.register("HealthResponse", healthResponseSchema);

  registry.registerPath({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Provera da li je API dostupan",
    responses: {
      200: jsonResponse(HealthResponse, "API radi"),
    },
  });
}
