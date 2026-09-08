import { healthResponseSchema, type HealthResponse } from "@risesolo/validation";

export interface ApiClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Tanki fetch klijent. Odgovor svakog poziva se runtime validira protiv
 * deljene Zod seme iz `@risesolo/validation`, tako da su TS tipovi i stvarni
 * oblik odgovora garantovano usklajeni (jedan izvor istine za DTO).
 */
export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  return {
    async getHealth(): Promise<HealthResponse> {
      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/health`);
      } catch (cause) {
        throw new ApiError("Health-check zahtev nije uspeo (mrezna greska)", cause);
      }

      if (!response.ok) {
        throw new ApiError(`Health-check je vratio status ${response.status}`);
      }

      const json: unknown = await response.json();
      const parsed = healthResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError("Odgovor health-check rute ne odgovara ocekivanoj semi", parsed.error);
      }

      return parsed.data;
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
