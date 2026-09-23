import {
  changeGuildMemberRoleRequestSchema,
  createGuildRequestSchema,
  donateToGuildRequestSchema,
  guildDetailSchema,
  guildMessageSchema,
  guildSummarySchema,
  joinGuildRequestSchema,
  postGuildMessageRequestSchema,
  z,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerGuildsPaths(): void {
  const GuildSummaryList = registry.register("GuildSummaryList", z.array(guildSummarySchema));
  const GuildDetail = registry.register("GuildDetail", guildDetailSchema);
  const CreateGuildRequest = registry.register("CreateGuildRequest", createGuildRequestSchema);
  const JoinGuildRequest = registry.register("JoinGuildRequest", joinGuildRequestSchema);
  const ChangeGuildMemberRoleRequest = registry.register("ChangeGuildMemberRoleRequest", changeGuildMemberRoleRequestSchema);
  const GuildMessage = registry.register("GuildMessage", guildMessageSchema);
  const GuildMessageList = registry.register("GuildMessageList", z.array(guildMessageSchema));
  const PostGuildMessageRequest = registry.register("PostGuildMessageRequest", postGuildMessageRequestSchema);
  const DonateToGuildRequest = registry.register("DonateToGuildRequest", donateToGuildRequestSchema);
  const userIdParam = z.object({ userId: z.string() });
  /** Nest vraća 201 podrazumevano za POST bez tela - kontroleri ovde ne koriste @HttpCode(204). */
  const emptyOk = { description: "Uspešno" };

  registry.registerPath({
    method: "get",
    path: "/guilds",
    tags: ["Guilds"],
    summary: "Lista svih cehova",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(GuildSummaryList), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "get",
    path: "/guilds/me",
    tags: ["Guilds"],
    summary: "Detalji ceha kome pripadam",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(GuildDetail), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds",
    tags: ["Guilds"],
    summary: "Osnuj novi ceh",
    security: AUTH_SECURITY,
    request: { body: jsonBody(CreateGuildRequest) },
    responses: { 201: jsonResponse(GuildDetail), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/join",
    tags: ["Guilds"],
    summary: "Pridruži se postojećem cehu",
    security: AUTH_SECURITY,
    request: { body: jsonBody(JoinGuildRequest) },
    responses: { 201: jsonResponse(GuildDetail), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/leave",
    tags: ["Guilds"],
    summary: "Napusti trenutni ceh",
    security: AUTH_SECURITY,
    responses: { 201: emptyOk, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/members/{userId}/kick",
    tags: ["Guilds"],
    summary: "Izbaci člana iz ceha (zahteva ulogu lidera/oficira)",
    security: AUTH_SECURITY,
    request: { params: userIdParam },
    responses: { 201: emptyOk, 403: { description: "Nedovoljna dozvola" }, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/members/{userId}/role",
    tags: ["Guilds"],
    summary: "Promeni ulogu člana ceha",
    security: AUTH_SECURITY,
    request: { params: userIdParam, body: jsonBody(ChangeGuildMemberRoleRequest) },
    responses: { 201: emptyOk, 400: badRequestResponse, 403: { description: "Nedovoljna dozvola" }, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "get",
    path: "/guilds/messages",
    tags: ["Guilds"],
    summary: "Poruke u ćaskaonici ceha",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(GuildMessageList), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/messages",
    tags: ["Guilds"],
    summary: "Pošalji poruku u ćaskaonicu ceha",
    security: AUTH_SECURITY,
    request: { body: jsonBody(PostGuildMessageRequest) },
    responses: { 201: jsonResponse(GuildMessage), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/treasury/donate",
    tags: ["Guilds"],
    summary: "Doniraj coins u riznicu ceha",
    security: AUTH_SECURITY,
    request: { body: jsonBody(DonateToGuildRequest) },
    responses: { 201: jsonResponse(GuildDetail), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/guilds/treasury/distribute",
    tags: ["Guilds"],
    summary: "Raspodeli nedeljnu riznicu cehovskog raid-a",
    security: AUTH_SECURITY,
    responses: { 201: jsonResponse(GuildDetail), ...AUTH_RESPONSES },
  });
}
