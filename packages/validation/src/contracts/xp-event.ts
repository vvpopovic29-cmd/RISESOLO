import { z } from "zod";

/** Runtime ugovor za `public.xp_events` red (Faza 1) - idempotency preko unique(user_id, source, source_id). */
export const xpEventRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  source: z.enum(["WORKOUT", "QUEST"]),
  source_id: z.string().min(1),
  amount: z.number().int().positive(),
  created_at: z.string(),
});

export type XpEventRow = z.infer<typeof xpEventRowSchema>;

/** Payload za insert - id/created_at generise baza. */
export const xpEventInsertSchema = xpEventRowSchema.omit({ id: true, created_at: true });
export type XpEventInsert = z.infer<typeof xpEventInsertSchema>;
