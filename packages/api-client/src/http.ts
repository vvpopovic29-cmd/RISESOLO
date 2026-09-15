import type { z } from "@risesolo/validation";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface HttpClientConfig {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /** Poziva se pre svakog autentifikovanog zahteva - vraca trenutni JWT ili null/undefined ako korisnik nije ulogovan. */
  getAccessToken?: () => string | null | undefined;
}

interface RequestOptions<TSchema extends z.ZodTypeAny | undefined> {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** Kad je `true` (podrazumevano), dodaje `Authorization: Bearer <token>` header. */
  auth?: boolean;
  /** Zod sema za runtime validaciju odgovora - izostavi za 204 No Content rute. */
  schema?: TSchema;
}

interface NestErrorBody {
  message?: string | string[];
  error?: string;
}

/**
 * Deljeni fetch wrapper: prilaze auth header, parsira gresku iz NestJS
 * odgovora ({message, error, statusCode}) i runtime-validira uspesan
 * odgovor protiv deljene Zod seme iz `@risesolo/validation` - isti ugovor
 * koji koristi i `apps/api`, tako da su tipovi i stvaran oblik odgovora
 * garantovano usklajeni.
 */
export function createHttpClient(config: HttpClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  return async function request<TSchema extends z.ZodTypeAny | undefined>(
    options: RequestOptions<TSchema>,
  ): Promise<TSchema extends z.ZodTypeAny ? z.infer<TSchema> : void> {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (options.auth ?? true) {
      const token = config.getAccessToken?.();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const search = options.query
      ? Object.entries(options.query)
          .filter((entry): entry is [string, string] => entry[1] !== undefined)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("&")
      : "";
    const url = `${baseUrl}${options.path}${search ? `?${search}` : ""}`;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (cause) {
      throw new ApiError(`Zahtev ka ${options.path} nije uspeo (mrezna greska)`, undefined, cause);
    }

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new ApiError(message, response.status);
    }

    if (!options.schema) {
      return undefined as TSchema extends z.ZodTypeAny ? z.infer<TSchema> : void;
    }

    const json: unknown = await response.json();
    const parsed = options.schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(`Odgovor ${options.path} ne odgovara ocekivanoj semi`, response.status, parsed.error);
    }
    return parsed.data as TSchema extends z.ZodTypeAny ? z.infer<TSchema> : void;
  };
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as NestErrorBody;
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    if (typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // Telo nije JSON - padamo na generacku poruku ispod.
  }
  return `Zahtev je vratio status ${response.status}`;
}
