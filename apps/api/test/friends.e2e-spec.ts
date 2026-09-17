import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Prijatelji/Rivali - Friendship model (usmereno PENDING/ACCEPTED), vidi
 * apps/api/src/friends/friends.service.ts. Radi protiv prave lokalne
 * Postgres baze, isti obrazac kao ostali e2e testovi.
 */
describe("Friends (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string; username: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `fr${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id, username };
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function setTotalXp(userId: string, totalXp: number): Promise<void> {
    await prisma.progression.update({ where: { userId }, data: { totalXp } });
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/friends").expect(401);
  });

  it("vraca prazan overview za novog korisnika", async () => {
    const { accessToken } = await registerUser("empty");
    const overview = await auth(accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(overview.body).toEqual({ friends: [], incomingRequests: [], outgoingRequests: [] });
  });

  it("slanje zahteva se pojavljuje kao odlazni kod posiljaoca i dolazni kod primaoca", async () => {
    const a = await registerUser("sendera");
    const b = await registerUser("senderb");

    const created = await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);
    expect(created.body).toMatchObject({ userId: b.userId, username: b.username });

    const aOverview = await auth(a.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(aOverview.body.outgoingRequests).toEqual([
      expect.objectContaining({ userId: b.userId, username: b.username }),
    ]);
    expect(aOverview.body.friends).toEqual([]);

    const bOverview = await auth(b.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(bOverview.body.incomingRequests).toEqual([
      expect.objectContaining({ userId: a.userId, username: a.username }),
    ]);
  });

  it("odbija slanje zahteva samom sebi (400)", async () => {
    const a = await registerUser("self");
    await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: a.username })
      .expect(400);
  });

  it("odbija slanje zahteva nepostojecem korisniku (404)", async () => {
    const a = await registerUser("ghost");
    await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: "nepostojeci_korisnik_xyz" })
      .expect(404);
  });

  it("odbija duplirani zahtev dok je prethodni na cekanju (409)", async () => {
    const a = await registerUser("dupa");
    const b = await registerUser("dupb");

    await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);
    await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(409);
    // Ni obrnut smer ne prolazi - B ne moze da "zaobidje" tako sto ce on poslati A-u.
    await auth(b.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: a.username })
      .expect(409);
  });

  it("prihvatanje zahteva pretvara oboje u prijatelje, sa nivoom/rank/XP", async () => {
    const a = await registerUser("accepta");
    const b = await registerUser("acceptb");
    await setTotalXp(b.userId, 500);

    const request1 = await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);

    const accepted = await auth(b.accessToken, request(app.getHttpServer()).post(`/friends/requests/${request1.body.id}/accept`)).expect(
      201,
    );
    expect(accepted.body).toMatchObject({ userId: a.userId, username: a.username });

    const aOverview = await auth(a.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(aOverview.body.friends).toEqual([expect.objectContaining({ userId: b.userId, username: b.username, totalXp: 500 })]);
    expect(aOverview.body.outgoingRequests).toEqual([]);

    const bOverview = await auth(b.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(bOverview.body.friends).toEqual([expect.objectContaining({ userId: a.userId, username: a.username })]);
    expect(bOverview.body.incomingRequests).toEqual([]);
  });

  it("odbija prihvatanje zahteva koji nije upucen meni (404)", async () => {
    const a = await registerUser("wrongacca");
    const b = await registerUser("wrongaccb");
    const intruder = await registerUser("wrongaccc");

    const req = await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);

    await auth(intruder.accessToken, request(app.getHttpServer()).post(`/friends/requests/${req.body.id}/accept`)).expect(404);
  });

  it("odbijanje (od primaoca) i otkazivanje (od posiljaoca) brisu zahtev na cekanju", async () => {
    const a = await registerUser("declinea");
    const b = await registerUser("declineb");

    const req1 = await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);
    await auth(b.accessToken, request(app.getHttpServer()).delete(`/friends/requests/${req1.body.id}`)).expect(204);

    // Slot je oslobodjen - A moze ponovo da posalje zahtev.
    const req2 = await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);
    await auth(a.accessToken, request(app.getHttpServer()).delete(`/friends/requests/${req2.body.id}`)).expect(204);

    const overview = await auth(a.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(overview.body.outgoingRequests).toEqual([]);
  });

  it("uklanjanje prijatelja brise prihvaceno prijateljstvo za oboje", async () => {
    const a = await registerUser("removea");
    const b = await registerUser("removeb");

    const req = await auth(a.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: b.username })
      .expect(201);
    await auth(b.accessToken, request(app.getHttpServer()).post(`/friends/requests/${req.body.id}/accept`)).expect(201);

    await auth(a.accessToken, request(app.getHttpServer()).delete(`/friends/${b.userId}`)).expect(204);

    const aOverview = await auth(a.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(aOverview.body.friends).toEqual([]);
    const bOverview = await auth(b.accessToken, request(app.getHttpServer()).get("/friends")).expect(200);
    expect(bOverview.body.friends).toEqual([]);
  });

  it("odbija uklanjanje nepostojeceg prijateljstva (404)", async () => {
    const a = await registerUser("noremovea");
    const b = await registerUser("noremoveb");
    await auth(a.accessToken, request(app.getHttpServer()).delete(`/friends/${b.userId}`)).expect(404);
  });

  it("rivali leaderboard sadrzi samo mene i prihvacene prijatelje, sortirano po XP", async () => {
    const me = await registerUser("rivalme");
    const friend = await registerUser("rivalfriend");
    const stranger = await registerUser("rivalstranger");

    await setTotalXp(me.userId, 900_000_000);
    await setTotalXp(friend.userId, 500_000_000);
    await setTotalXp(stranger.userId, 999_999_999);

    const req = await auth(me.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: friend.username })
      .expect(201);
    await auth(friend.accessToken, request(app.getHttpServer()).post(`/friends/requests/${req.body.id}/accept`)).expect(201);

    const leaderboard = await auth(me.accessToken, request(app.getHttpServer()).get("/friends/leaderboard")).expect(200);
    const userIds = leaderboard.body.entries.map((entry: { userId: string }) => entry.userId);
    expect(userIds).toEqual([me.userId, friend.userId]);
    expect(userIds).not.toContain(stranger.userId);
    expect(leaderboard.body.entries[0]).toMatchObject({ position: 1, userId: me.userId, totalXp: 900_000_000 });
    expect(leaderboard.body.entries[1]).toMatchObject({ position: 2, userId: friend.userId, totalXp: 500_000_000 });
  });
});
