import { authResponseSchema, loginRequestSchema, registerRequestSchema } from "@risesolo/validation";
import { badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerAuthPaths(): void {
  const RegisterRequest = registry.register("RegisterRequest", registerRequestSchema);
  const LoginRequest = registry.register("LoginRequest", loginRequestSchema);
  const AuthResponse = registry.register("AuthResponse", authResponseSchema);

  registry.registerPath({
    method: "post",
    path: "/auth/register",
    tags: ["Auth"],
    summary: "Registracija novog korisnika",
    description: "Ograničeno na 5 zahteva/min po IP adresi (vidi AUTH_THROTTLE).",
    request: { body: jsonBody(RegisterRequest) },
    responses: {
      201: jsonResponse(AuthResponse, "Nalog kreiran, JWT token vraćen"),
      400: badRequestResponse,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/auth/login",
    tags: ["Auth"],
    summary: "Prijava postojećeg korisnika",
    description: "Ograničeno na 5 zahteva/min po IP adresi (vidi AUTH_THROTTLE).",
    request: { body: jsonBody(LoginRequest) },
    responses: {
      200: jsonResponse(AuthResponse, "Prijava uspešna, JWT token vraćen"),
      400: badRequestResponse,
    },
  });
}
