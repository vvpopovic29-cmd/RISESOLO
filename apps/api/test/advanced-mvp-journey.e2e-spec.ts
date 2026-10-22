import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { calculateGuildXpContribution } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Cross-module "napredni MVP" putanja jednog igraca kroz celu aplikaciju:
 * katalog vezbi -> workout template -> trening iz template-a (reps + hold
 * serije) -> istorija i licni rekordi -> progresija igraca -> ranking ->
 * guild + guild ranking -> push token -> prodavnica. Svaki modul ima svoj
 * detaljan e2e; ovaj hvata greske u SPOJEVIMA izmedju modula (npr. da XP iz
 * treninga stvarno stigne do leaderboard-a i guild totala).
 */
describe("Advanced MVP journey (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const createdGuildIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (createdGuildIds.length > 0) {
      await prisma.guild.deleteMany({ where: { id: { in: createdGuildIds } } });
    }
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  const auth = (token: string, req: request.Test) => req.set("Authorization", `Bearer ${token}`);

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        email: `test-${runId}-${suffix}@risesolo.test`,
        password: "correct-horse-battery-staple",
        username: `mvp${runId}${suffix}`,
      })
      .expect(201);
    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  it("igrac prolazi ceo tok: katalog -> template -> trening -> istorija/rekordi -> ranking -> guild", async () => {
    const { accessToken, userId } = await registerUser("full");
    const http = () => app.getHttpServer();

    // 1) Katalog: jedna reps vezba i jedna hold (izometrijska) vezba.
    const catalog = (await auth(accessToken, request(http()).get("/exercises")).expect(200)).body as Array<{
      id: string;
      slug: string;
      defaultReps: string | null;
      holdSeconds: number | null;
    }>;
    const repsExercise = catalog.find((e) => e.defaultReps !== null);
    const holdExercise = catalog.find((e) => e.holdSeconds !== null);
    expect(repsExercise).toBeDefined();
    expect(holdExercise).toBeDefined();

    // 2) Template od dve vezbe iz kataloga.
    const template = await auth(accessToken, request(http()).post("/workouts/templates"))
      .send({ name: "MVP Dan", exercises: [{ exerciseId: repsExercise?.id }, { exerciseId: holdExercise?.id }] })
      .expect(201);
    const templates = await auth(accessToken, request(http()).get("/workouts/templates")).expect(200);
    expect(templates.body).toEqual([expect.objectContaining({ id: template.body.id, name: "MVP Dan", exerciseCount: 2 })]);

    // 3) Trening iz template-a: nema aktivne sesije -> start -> aktivna sesija vidljiva -> serije -> zavrsetak.
    expect((await auth(accessToken, request(http()).get("/workouts/sessions/active")).expect(200)).body.session).toBeNull();

    const session = await auth(accessToken, request(http()).post("/workouts/sessions"))
      .send({ workoutId: template.body.id })
      .expect(201);

    // Druga sesija dok je prva u toku nije dozvoljena.
    await auth(accessToken, request(http()).post("/workouts/sessions")).send({}).expect(409);

    await auth(accessToken, request(http()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId: repsExercise?.id, setNumber: 1, reps: 12, weightKg: 20, completed: true })
      .expect(204);
    await auth(accessToken, request(http()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId: holdExercise?.id, setNumber: 1, durationSeconds: 45, completed: true })
      .expect(204);

    const active = await auth(accessToken, request(http()).get("/workouts/sessions/active")).expect(200);
    expect(active.body.session).toMatchObject({ id: session.body.id });
    expect(active.body.sets).toHaveLength(2);

    const completion = await auth(
      accessToken,
      request(http()).post(`/workouts/sessions/${session.body.id}/complete`),
    ).expect(201);
    expect(completion.body).toMatchObject({ success: true, streak: 1 });
    expect(completion.body.xpGained).toBeGreaterThanOrEqual(150);

    // 4) Posle zavrsetka nema aktivne sesije; istorija nosi ime template-a; rekordi pokrivaju obe vezbe.
    expect((await auth(accessToken, request(http()).get("/workouts/sessions/active")).expect(200)).body.session).toBeNull();

    const history = await auth(accessToken, request(http()).get("/workouts/history")).expect(200);
    // Istorija pokazuje samo XP za sam trening (150), ne i bonuse questova/side questova.
    expect(history.body).toEqual([expect.objectContaining({ workoutName: "MVP Dan", xpGained: 150 })]);

    const records = await auth(accessToken, request(http()).get("/workouts/personal-records")).expect(200);
    expect(records.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ exerciseId: repsExercise?.id, bestReps: 12 }),
        expect.objectContaining({ exerciseId: holdExercise?.id, bestDurationSeconds: 45 }),
      ]),
    );

    // 5) Progresija igraca odrazava XP iz treninga i poklapa se sa responsom completion-a.
    const me = await auth(accessToken, request(http()).get("/players/me")).expect(200);
    expect(me.body.progression).toMatchObject({
      totalXp: completion.body.totalXp,
      level: completion.body.level,
      coins: completion.body.coins,
      currentStreak: 1,
    });

    // 6) Ranking: igrac je u rang listi sa istim XP-om.
    const board = await auth(accessToken, request(http()).get("/leaderboard/players")).expect(200);
    expect(board.body.me).toMatchObject({ userId, totalXp: completion.body.totalXp });

    // 7) Guild: osnivac je clan, guild ranking prikazuje njegov guild; XP iz sledeceg treninga
    //    stize do guild totala (guilds.recordXp na completion-u).
    const tag = `M${runId.slice(0, 3).toUpperCase()}`;
    const guild = await auth(accessToken, request(http()).post("/guilds"))
      .send({ name: `MVP Guild ${runId}`, tag })
      .expect(201);
    createdGuildIds.push(guild.body.id);

    const secondSession = await auth(accessToken, request(http()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(http()).post(`/workouts/sessions/${secondSession.body.id}/sets`))
      .send({ exerciseId: repsExercise?.id, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    const secondCompletion = await auth(
      accessToken,
      request(http()).post(`/workouts/sessions/${secondSession.body.id}/complete`),
    ).expect(201);

    const guildBoard = await auth(accessToken, request(http()).get("/leaderboard/guilds")).expect(200);
    expect(guildBoard.body.myGuild).toMatchObject({ guildId: guild.body.id, tag, memberCount: 1 });
    // Guild dobija deo (GUILD_XP_CONTRIBUTION_RATE) XP-a koji je igrac zaradio posle ulaska u guild.
    expect(guildBoard.body.myGuild.totalXp).toBe(calculateGuildXpContribution(secondCompletion.body.xpGained));

    // 8) Push token registracija je idempotentna (isti token dvaput = jedan red).
    const token = `ExponentPushToken[${runId}-journey]`;
    await auth(accessToken, request(http()).post("/notifications/push-token")).send({ token, platform: "IOS" }).expect(204);
    await auth(accessToken, request(http()).post("/notifications/push-token")).send({ token, platform: "IOS" }).expect(204);
    expect(await prisma.pushToken.count({ where: { token, userId } })).toBe(1);

    // 9) Prodavnica je dostupna i nema ostecenih cena.
    const shop = await auth(accessToken, request(http()).get("/shop")).expect(200);
    expect(Array.isArray(shop.body)).toBe(true);
    for (const item of shop.body) {
      expect(item.price).toBeGreaterThanOrEqual(0);
    }
  });

  it("izolacija podataka: tudji korisnik ne vidi istoriju, template ni sesiju drugog igraca", async () => {
    const owner = await registerUser("own");
    const other = await registerUser("oth");
    const http = () => app.getHttpServer();
    const exercise = await prisma.exercise.findFirstOrThrow();

    const template = await auth(owner.accessToken, request(http()).post("/workouts/templates"))
      .send({ name: "Privatni", exercises: [{ exerciseId: exercise.id }] })
      .expect(201);

    await auth(other.accessToken, request(http()).get(`/workouts/templates/${template.body.id}`)).expect(404);
    await auth(other.accessToken, request(http()).post("/workouts/sessions"))
      .send({ workoutId: template.body.id })
      .expect(404);
    expect((await auth(other.accessToken, request(http()).get("/workouts/templates")).expect(200)).body).toEqual([]);
    expect((await auth(other.accessToken, request(http()).get("/workouts/history")).expect(200)).body).toEqual([]);
  });
});
