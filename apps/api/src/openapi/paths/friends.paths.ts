import {
  friendRequestSchema,
  friendSchema,
  friendsLeaderboardResponseSchema,
  friendsOverviewSchema,
  sendFriendRequestSchema,
  z,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, noContentResponse, registry } from "../registry";

export function registerFriendsPaths(): void {
  const FriendsOverview = registry.register("FriendsOverview", friendsOverviewSchema);
  const FriendsLeaderboardResponse = registry.register("FriendsLeaderboardResponse", friendsLeaderboardResponseSchema);
  const SendFriendRequestRequest = registry.register("SendFriendRequestRequest", sendFriendRequestSchema);
  const FriendRequest = registry.register("FriendRequest", friendRequestSchema);
  const Friend = registry.register("Friend", friendSchema);
  const requestIdParam = z.object({ id: z.string() });

  registry.registerPath({
    method: "get",
    path: "/friends",
    tags: ["Friends"],
    summary: "Lista prijatelja i dolazni/odlazni zahtevi",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(FriendsOverview), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "get",
    path: "/friends/leaderboard",
    tags: ["Friends"],
    summary: "Rang lista samo među prijateljima",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(FriendsLeaderboardResponse), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/friends/requests",
    tags: ["Friends"],
    summary: "Pošalji zahtev za prijateljstvo",
    security: AUTH_SECURITY,
    request: { body: jsonBody(SendFriendRequestRequest) },
    responses: { 201: jsonResponse(FriendRequest), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/friends/requests/{id}/accept",
    tags: ["Friends"],
    summary: "Prihvati zahtev za prijateljstvo",
    security: AUTH_SECURITY,
    request: { params: requestIdParam },
    responses: { 201: jsonResponse(Friend), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "delete",
    path: "/friends/requests/{id}",
    tags: ["Friends"],
    summary: "Odbij (ili otkaži) zahtev za prijateljstvo",
    security: AUTH_SECURITY,
    request: { params: requestIdParam },
    responses: { 204: noContentResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "delete",
    path: "/friends/{userId}",
    tags: ["Friends"],
    summary: "Ukloni prijatelja",
    security: AUTH_SECURITY,
    request: { params: z.object({ userId: z.string() }) },
    responses: { 204: noContentResponse, ...AUTH_RESPONSES },
  });
}
