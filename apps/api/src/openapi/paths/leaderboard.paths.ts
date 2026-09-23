import { guildLeaderboardResponseSchema, leaderboardQuerySchema, playerLeaderboardResponseSchema } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, jsonResponse, registry } from "../registry";

export function registerLeaderboardPaths(): void {
  const LeaderboardQuery = registry.register("LeaderboardQuery", leaderboardQuerySchema);
  const PlayerLeaderboardResponse = registry.register("PlayerLeaderboardResponse", playerLeaderboardResponseSchema);
  const GuildLeaderboardResponse = registry.register("GuildLeaderboardResponse", guildLeaderboardResponseSchema);

  registry.registerPath({
    method: "get",
    path: "/leaderboard/players",
    tags: ["Leaderboard"],
    summary: "Top igrači po XP-u",
    security: AUTH_SECURITY,
    request: { query: LeaderboardQuery },
    responses: {
      200: jsonResponse(PlayerLeaderboardResponse),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "get",
    path: "/leaderboard/guilds",
    tags: ["Leaderboard"],
    summary: "Top cehovi po XP-u",
    security: AUTH_SECURITY,
    request: { query: LeaderboardQuery },
    responses: {
      200: jsonResponse(GuildLeaderboardResponse),
      ...AUTH_RESPONSES,
    },
  });
}
