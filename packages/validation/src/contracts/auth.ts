import { z } from "zod";

/**
 * Auth DTO ugovor - deljen izmedju apps/api (controller odgovor/telo
 * zahteva) i packages/api-client (runtime validacija na klijentu).
 */
export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Lozinka mora imati bar 8 karaktera"),
  username: z
    .string()
    .min(3, "Korisnicko ime mora imati bar 3 karaktera")
    .max(24, "Korisnicko ime moze imati najvise 24 karaktera")
    .regex(/^[a-zA-Z0-9_]+$/, "Korisnicko ime sme sadrzati samo slova, brojeve i _"),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
