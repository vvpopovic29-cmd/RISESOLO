import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { selectDailyQuestKind, type DailyQuestKind } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Integracioni test celog "core gameplay loop"-a (FAZA 13 test matrica iz
 * plana): register/login -> onboarding -> daily quest -> workout session ->
 * completion engine (XP/Level/Coins/Streak) -> edge case-ovi (dupli
 * zavrsetak, prazan trening, pristup tudjem resursu). Radi protiv prave
 * lokalne Postgres baze (ne mock) - proverava da migracije i servisi
 * stvarno rade zajedno, ne samo tipove.
 */
describe("Core gameplay loop (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];

  // Kratak da username (max 24 karaktera, npr. "tester" + runId + "intruder") stane u limit.
  const runId = Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Ciscenje test podataka - kaskadno brisanje preko onDelete: Cascade na User relaciji.
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    const email = `test-${runId}-${suffix}@risesolo.test`;
    const username = `tester${runId}${suffix}`;
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  /**
   * Neki testovi pretpostavljaju da workout zavrsava DANASNJI dnevni quest
   * (WORKOUT_COMPLETE kind) da bi fiksni xpGained iznosi bili tacni - vidi
   * @risesolo/domain daily-quest-pool (varijetet dnevnih questova). Registruje
   * korisnike dok hash ne izabere zeljeni kind za danasnji datum (deterministicki,
   * ocekivano par pokusaja jer DAILY_QUEST_KINDS ima samo 2 clana).
   */
  async function registerUserWithDailyQuestKind(suffix: string, desiredKind: DailyQuestKind): Promise<{ accessToken: string; userId: string }> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const user = await registerUser(`${suffix}${attempt}`);
      if (selectDailyQuestKind(user.userId, new Date()) === desiredKind) {
        return user;
      }
    }
    throw new Error(`Nije pronadjen korisnik sa dnevnim kind-om ${desiredKind} posle 50 pokusaja`);
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/players/me").expect(401);
  });

  it("register + login vraca JWT i inicijalno stanje igraca (level 1, 0 XP, rank E)", async () => {
    const { accessToken } = await registerUser("core");

    const state = await request(app.getHttpServer())
      .get("/players/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(state.body.progression).toMatchObject({
      totalXp: 0,
      level: 1,
      rank: "E",
      coins: 0,
      currentStreak: 0,
    });
    expect(state.body.stats).toMatchObject({
      strength: 1,
      agility: 1,
      endurance: 1,
      vitality: 1,
      intelligence: 1,
      statPoints: 0,
    });
  });

  it("odbija duplu registraciju sa istim email-om (409)", async () => {
    const email = `test-${runId}-dup@risesolo.test`;
    const username = `testerdup${runId}`;
    await request(app.getHttpServer()).post("/auth/register").send({ email, password: "correct-horse-battery-staple", username }).expect(201);
    createdUserIds.push((await prisma.user.findUniqueOrThrow({ where: { email } })).id);

    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "another-password-1", username: `${username}2` })
      .expect(409);
  });

  it("daily quest generator je idempotentan (isti quest id na uzastopne pozive)", async () => {
    const { accessToken } = await registerUser("quest");

    const first = await request(app.getHttpServer())
      .get("/quests/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .get("/quests/today")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(first.body.id).toBe(second.body.id);
    expect(first.body.status).toBe("AVAILABLE");
  });

  it("kompletira ceo gameplay loop: workout + daily quest u istom danu daju XP, level-up, coins i streak=1", async () => {
    const { accessToken } = await registerUserWithDailyQuestKind("loop", "WORKOUT_COMPLETE");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    const exercise = await prisma.exercise.findFirstOrThrow();

    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    const sessionId = session.body.id;

    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/sets`))
      .send({ exerciseId: exercise.id, setNumber: 1, reps: 10, completed: true })
      .expect(204);

    const completion = await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/complete`)).expect(201);

    // WORKOUT_COMPLETE (150) + prvi DAILY_QUEST_COMPLETE istog dana (100) + Side Quest "nova
    // vezba" bonus za PRVU ikad zavrsenu vezbu ovog korisnika (50) = 300 XP -> level 1 -> 2.
    expect(completion.body).toMatchObject({
      success: true,
      xpGained: 300,
      totalXp: 300,
      level: 2,
      levelUp: true,
      statPointsGained: 3,
      coinsGained: 50,
      coins: 50,
      questCompleted: true,
      streak: 1,
    });

    const state = await auth(request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(state.body.progression).toMatchObject({ totalXp: 300, level: 2, rank: "E", coins: 50, currentStreak: 1 });
    expect(state.body.stats.statPoints).toBe(3);
  });

  it("odbija dupli zavrsetak istog treninga (vec COMPLETED)", async () => {
    const { accessToken } = await registerUser("dupe");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);
    const exercise = await prisma.exercise.findFirstOrThrow();

    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    const sessionId = session.body.id;
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/sets`))
      .send({ exerciseId: exercise.id, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/complete`)).expect(201);

    // Drugi poziv na isti session -> status vise nije IN_PROGRESS.
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/complete`)).expect(400);
  });

  it("odbija zavrsetak treninga bez ijedne zavrsene serije (400)", async () => {
    const { accessToken } = await registerUser("empty");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(400);
  });

  it("odbija pristup tudjoj workout sesiji (404, ne curi da resurs postoji)", async () => {
    const userA = await registerUser("owner");
    const userB = await registerUser("intruder");

    const session = await request(app.getHttpServer())
      .post("/workouts/sessions")
      .set("Authorization", `Bearer ${userA.accessToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/workouts/sessions/${session.body.id}/complete`)
      .set("Authorization", `Bearer ${userB.accessToken}`)
      .expect(404);
  });

  it("allocateStatPoints odbija raspodelu koja prelazi dostupne poene (400)", async () => {
    const { accessToken } = await registerUser("stats");
    await request(app.getHttpServer())
      .post("/players/me/stats/allocate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ strength: 1 })
      .expect(400); // 0 dostupnih poena na levelu 1
  });
});
