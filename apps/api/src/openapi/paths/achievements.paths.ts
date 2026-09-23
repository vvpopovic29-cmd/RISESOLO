import { listAchievementsResponseSchema } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, jsonResponse, registry } from "../registry";

export function registerAchievementsPaths(): void {
  const AchievementList = registry.register("AchievementList", listAchievementsResponseSchema);

  registry.registerPath({
    method: "get",
    path: "/achievements",
    tags: ["Achievements"],
    summary: "Moja dostignuća (otključana i zaključana)",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(AchievementList),
      ...AUTH_RESPONSES,
    },
  });
}
