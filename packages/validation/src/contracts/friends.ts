import { RANKS } from "@risesolo/domain";
import { z } from "zod";

/** Isti obrazac kao registerRequestSchema.username - trazimo tacno korisnicko ime, ne pretragu. */
export const sendFriendRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Korisnicko ime mora imati bar 3 karaktera")
    .max(24, "Korisnicko ime moze imati najvise 24 karaktera")
    .regex(/^[a-zA-Z0-9_]+$/, "Korisnicko ime sme sadrzati samo slova, brojeve i _"),
});
export type SendFriendRequestRequest = z.infer<typeof sendFriendRequestSchema>;

/** Zahtev na cekanju - `userId`/`username` je UVEK ta druga strana (posiljalac za dolazne, primalac za odlazne). */
export const friendRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  createdAt: z.string(),
});
export type FriendRequestDto = z.infer<typeof friendRequestSchema>;

export const friendSchema = z.object({
  userId: z.string(),
  username: z.string(),
  level: z.number().int().min(1),
  rank: z.enum(RANKS),
  totalXp: z.number().int().min(0),
});
export type FriendDto = z.infer<typeof friendSchema>;

export const friendsOverviewSchema = z.object({
  friends: z.array(friendSchema),
  incomingRequests: z.array(friendRequestSchema),
  outgoingRequests: z.array(friendRequestSchema),
});
export type FriendsOverviewResponse = z.infer<typeof friendsOverviewSchema>;

/** "Rivali" - live leaderboard ogranicen na mene + prihvacene prijatelje, isti oblik kao PlayerLeaderboardEntryDto. */
export const friendLeaderboardEntrySchema = z.object({
  position: z.number().int().min(1),
  userId: z.string(),
  username: z.string(),
  level: z.number().int().min(1),
  rank: z.enum(RANKS),
  totalXp: z.number().int().min(0),
});
export type FriendLeaderboardEntryDto = z.infer<typeof friendLeaderboardEntrySchema>;

export const friendsLeaderboardResponseSchema = z.object({
  entries: z.array(friendLeaderboardEntrySchema),
});
export type FriendsLeaderboardResponseDto = z.infer<typeof friendsLeaderboardResponseSchema>;
