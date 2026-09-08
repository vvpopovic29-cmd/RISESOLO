import { z } from "zod";

/**
 * Jedini DTO ugovor u Fazi 1. Deli ga apps/api (odgovor kontrolera) i
 * packages/api-client (runtime validacija + tipovi na klijentu), tako da
 * su tipovi na oba kraja garantovano usklajeni sa jednim izvorom istine.
 */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
