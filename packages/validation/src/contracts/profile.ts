import { z } from "zod";

/**
 * Runtime ugovor za `public.profiles` red (Faza 2). Nema odgovarajuci
 * @risesolo/domain tip - profil (username/avatar) nije poslovna logika,
 * samo sadrzaj, pa ovde definisemo i camelCase oblik + mapper.
 */
export const profileRowSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(24),
  avatar_url: z.string().url().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProfileRow = z.infer<typeof profileRowSchema>;

export interface Profile {
  readonly id: string;
  readonly username: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function mapProfileRowToDomain(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
