import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Leaderboard - live upit nad Progression/Guild (bez keširanja, vidi README
 * "Poznata ograničenja"). Testovi seed-uju totalXp direktno preko Prisma-e
 * (umesto stvarnog odigravanja desetina treninga) da bi poredak bio
 * deterministican.
 */
describe("Leaderboard (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;
  let guildSeq = 0;

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

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `lb${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function setTotalXp(userId: string, totalXp: number): Promise<void> {
    await prisma.progression.update({ where: { userId }, data: { totalXp } });
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/leaderboard/players").expect(401);
    await request(app.getHttpServer()).get("/leaderboard/guilds").expect(401);
  });

  it("vraca igrace sortirane po totalXp sa ispravnim relativnim pozicijama i 'me' poljem unutar top liste", async () => {
    // Namerno vrlo velike totalXp vrednosti (umesto oslanjanja na to da je
    // baza prazna) - provera je RELATIVNA (uzastopne pozicije), ne apsolutna
    // (pozicija 1/2/3), jer deljena dev/CI baza moze imati i druge korisnike.
    const first = await registerUser("first");
    const second = await registerUser("second");
    const third = await registerUser("third");
    await setTotalXp(first.userId, 900_000_000);
    await setTotalXp(second.userId, 500_000_000);
    await setTotalXp(third.userId, 100_000_000);

    const response = await auth(second.accessToken, request(app.getHttpServer()).get("/leaderboard/players"))
      .query({ limit: 100 })
      .expect(200);

    const byUserId = new Map(response.body.entries.map((e: { userId: string; position: number }) => [e.userId, e.position]));
    const firstPosition = byUserId.get(first.userId);
    expect(byUserId.get(second.userId)).toBe((firstPosition as number) + 1);
    expect(byUserId.get(third.userId)).toBe((firstPosition as number) + 2);
    expect(response.body.me).toMatchObject({ userId: second.userId, position: (firstPosition as number) + 1, totalXp: 500_000_000 });
  });

  it("racuna 'me' poziciju van top liste kada je limit manji od korisnikove pozicije", async () => {
    // `totalXp: 0` garantuje da je ovaj korisnik NIKAD u top 1 (drugi testovi u
    // ovoj datoteci seed-uju vece vrednosti u istoj bazi) - test ne zavisi od
    // toga ko je tacno na poziciji 1, samo da 'me' korektno racuna sopstvenu
    // poziciju van vracene top liste.
    const { accessToken, userId } = await registerUser("limuser");
    await setTotalXp(userId, 0);

    const response = await auth(accessToken, request(app.getHttpServer()).get("/leaderboard/players"))
      .query({ limit: 1 })
      .expect(200);

    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0].userId).not.toBe(userId);
    expect(response.body.me).toMatchObject({ userId, totalXp: 0 });
    expect(response.body.me.position).toBeGreaterThan(1);
  });

  it("odbacuje nevalidan limit (400)", async () => {
    const { accessToken } = await registerUser("badlimit");

    await auth(accessToken, request(app.getHttpServer()).get("/leaderboard/players"))
      .query({ limit: 0 })
      .expect(400);
    await auth(accessToken, request(app.getHttpServer()).get("/leaderboard/players"))
      .query({ limit: 1000 })
      .expect(400);
  });

  it("vraca cehove sortirane po totalXp sa memberCount i myGuild je null van ceha", async () => {
    const solo = await registerUser("guild-solo");
    const owner = await registerUser("guild-owner");
    const member = await registerUser("guild-member");
    guildSeq += 1;
    const guildTag = `${runId.slice(0, 4)}L${guildSeq}`.toUpperCase();

    const guild = await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: `Leaderboard Guild ${runId}${guildSeq}`, tag: guildTag })
      .expect(201);
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join"))
      .send({ tag: guildTag })
      .expect(201);
    await prisma.guild.update({ where: { id: guild.body.id }, data: { totalXp: 7000 } });

    const response = await auth(solo.accessToken, request(app.getHttpServer()).get("/leaderboard/guilds"))
      .query({ limit: 100 })
      .expect(200);

    const entry = response.body.entries.find((e: { guildId: string }) => e.guildId === guild.body.id);
    expect(entry).toMatchObject({ tag: guildTag, totalXp: 7000, memberCount: 2 });
    expect(response.body.myGuild).toBeNull();
  });

  it("vraca myGuild sa ispravnom pozicijom za clana ceha", async () => {
    const owner = await registerUser("mine-owner");
    guildSeq += 1;
    const guildTag = `${runId.slice(0, 4)}M${guildSeq}`.toUpperCase();

    const guild = await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: `My Guild ${runId}${guildSeq}`, tag: guildTag })
      .expect(201);
    await prisma.guild.update({ where: { id: guild.body.id }, data: { totalXp: 500 } });

    const response = await auth(owner.accessToken, request(app.getHttpServer()).get("/leaderboard/guilds"))
      .query({ limit: 100 })
      .expect(200);

    expect(response.body.myGuild).toMatchObject({ guildId: guild.body.id, tag: guildTag, totalXp: 500, memberCount: 1 });
  });
});
