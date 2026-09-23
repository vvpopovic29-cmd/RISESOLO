import {
  allocateStatPointsRequestSchema,
  onboardProfileRequestSchema,
  playerStateSchema,
  updateLocaleRequestSchema,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerPlayersPaths(): void {
  const PlayerState = registry.register("PlayerState", playerStateSchema);
  const OnboardProfileRequest = registry.register("OnboardProfileRequest", onboardProfileRequestSchema);
  const AllocateStatPointsRequest = registry.register("AllocateStatPointsRequest", allocateStatPointsRequestSchema);
  const UpdateLocaleRequest = registry.register("UpdateLocaleRequest", updateLocaleRequestSchema);

  registry.registerPath({
    method: "get",
    path: "/players/me",
    tags: ["Players"],
    summary: "Trenutno stanje igrača (profil, statistika, progresija)",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(PlayerState),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/players/me/onboarding",
    tags: ["Players"],
    summary: "Završi onboarding (inicijalni profil)",
    security: AUTH_SECURITY,
    request: { body: jsonBody(OnboardProfileRequest) },
    responses: {
      200: jsonResponse(PlayerState),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/players/me/stats/allocate",
    tags: ["Players"],
    summary: "Raspodeli slobodne poene statistike",
    security: AUTH_SECURITY,
    request: { body: jsonBody(AllocateStatPointsRequest) },
    responses: {
      200: jsonResponse(PlayerState),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/players/me/locale",
    tags: ["Players"],
    summary: "Promeni jezik (EN/SR)",
    security: AUTH_SECURITY,
    request: { body: jsonBody(UpdateLocaleRequest) },
    responses: {
      200: jsonResponse(PlayerState),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });
}
