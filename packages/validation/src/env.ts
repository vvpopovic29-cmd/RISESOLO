import { z } from "zod";

/**
 * Formatira Zod greske u citljivu, viselinijsku poruku pogodnu za
 * ispis prilikom pokretanja aplikacije (fail-fast na pogresan environment).
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

export class EnvValidationError extends Error {
  constructor(
    public readonly issues: z.ZodIssue[],
    context?: string,
  ) {
    const header = context ? `Nevalidan environment (${context}):` : "Nevalidan environment:";
    super(
      `${header}\n${issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`,
    );
    this.name = "EnvValidationError";
  }
}

/**
 * Parsira i validira sirovi environment objekat (npr. `process.env`) prema
 * datoj Zod semi. Baca {@link EnvValidationError} sa citljivim opisom svih
 * gresaka odjednom (ne staje na prvoj), umesto da vraca neispravno stanje
 * dalje kroz aplikaciju.
 */
export function loadEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  source: Record<string, string | undefined> = process.env,
  context?: string,
): z.infer<TSchema> {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new EnvValidationError(result.error.issues, context);
  }

  return result.data;
}

/** Zajednicki primitivi za sastavljanje environment sema po aplikaciji. */
export const envPrimitives = {
  port: z.coerce.number().int().min(1).max(65535),
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  url: z.string().url(),
  nonEmptyString: z.string().min(1),
};
