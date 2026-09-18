import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { selectDailyQuestKind, type DailyQuestKind } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Side Quest = bonus izazov vezan za KONKRETNU sesiju treninga (MVP: samo
 * "nova vezba" - zavrsi seriju vezbe koju nikad pre nisi zavrsio). Za razliku
 * od Boss/Weekly/Main Questa, GET /quests/side je READ-ONLY (nikad ne
 * zavrsava quest) - zavrsetak se desava ISKLJUCIVO u
 * WorkoutsService.completeSession (vidi apps/api/src/quests/quests.service.ts).
 * Radi protiv prave lokalne Postgres baze, isti obrazac kao boss/main-quest
 * e2e specovima. Iscrpljenost biblioteke vezbi (247 vezbi) se NAMERNO ne
 * testira ovde - nije prakticno odraditi 247 stvarnih treninga u e2e testu;
 * kod je dizajniran da vrati `quest: null` bez pada (vidi
 * QuestsService.generateSideQuest), ali taj put nije pokriven ovim testovima.
 */
describe("Side quest (e2e)", () => {
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

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `sq${runId}${suffix}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  /**
   * Workout testovi ovde NAMERNO fiksiraju dnevni quest kind na LOG_NUTRITION
   * (isti "registruj dok hash ne pogodi" princip kao boss-quest.e2e-spec.ts) -
   * inace bi WORKOUT_COMPLETE dnevni quest povremeno dodao +100 XP/+15 coins i
   * ucinio xpGained asertacije nedeterministickim (side quest bonus se ovde
   * testira izolovano od varijeteta dnevnih questova).
   */
  async function registerUserWithLogNutritionKind(suffix: string): Promise<{ accessToken: string; userId: string }> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const user = await registerUser(`${suffix}${attempt}`);
      if (selectDailyQuestKind(user.userId, new Date()) === ("LOG_NUTRITION" satisfies DailyQuestKind)) {
        return user;
      }
    }
    throw new Error("Nije pronadjen korisnik sa dnevnim kind-om LOG_NUTRITION posle 50 pokusaja");
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getSideQuest(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/quests/side")).expect(200);
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  it("generise AVAILABLE side quest (nova vezba, cilj 1) za novog korisnika, idempotentno", async () => {
    const { accessToken } = await registerUser("fresh");

    const first = await getSideQuest(accessToken);
    const second = await getSideQuest(accessToken);

    expect(first.body.quest).not.toBeNull();
    expect(first.body.quest.id).toBe(second.body.quest.id);
    expect(first.body.quest).toMatchObject({
      kind: "NEW_EXERCISE",
      targetProgress: 1,
      progress: 0,
      status: "AVAILABLE",
      xpReward: 50,
      coinReward: 10,
    });
  });

  it("zavrsava se kada zavrsena sesija sadrzi vezbu koju korisnik nikad pre nije radio, i lanac napreduje na sledeci", async () => {
    const { accessToken } = await registerUserWithLogNutritionKind("newex");
    const [exerciseA] = await prisma.exercise.findMany({ take: 1 });
    if (!exerciseA) throw new Error("Nema seed vezbi u bazi");

    const before = await getSideQuest(accessToken);
    expect(before.body.quest).toMatchObject({ status: "AVAILABLE" });

    // Prva ikad zavrsena vezba ovog korisnika - Side Quest se zavrsava (50 XP + 10 coins bonus).
    const completion = await completeWorkout(accessToken, exerciseA.id);
    expect(completion.body).toMatchObject({ sideQuestCompleted: true, xpGained: 200 });

    // GET vraca SLEDECI quest u lancu (nov id, ponovo AVAILABLE) - vidi Main Quest lanac obrazac.
    const after = await getSideQuest(accessToken);
    expect(after.body.quest.id).not.toBe(before.body.quest.id);
    expect(after.body.quest).toMatchObject({ status: "AVAILABLE", progress: 0 });
  });

  it("ne zavrsava se ponavljanjem VEC zavrsene vezbe - samo istinski NOVA vezba se racuna", async () => {
    const { accessToken } = await registerUserWithLogNutritionKind("repeat");
    const [exerciseA, exerciseB] = await prisma.exercise.findMany({ take: 2 });
    if (!exerciseA || !exerciseB) throw new Error("Potrebne su bar 2 seed vezbe u bazi");

    const first = await completeWorkout(accessToken, exerciseA.id);
    expect(first.body.sideQuestCompleted).toBe(true);

    // Ponavljanje ISTE vezbe ne zavrsava SLEDECI Side Quest u lancu (nije "nova").
    const repeat = await completeWorkout(accessToken, exerciseA.id);
    expect(repeat.body.sideQuestCompleted).toBe(false);

    // Prava NOVA vezba (drugacija od svega ranije zavrsenog) zavrsava sledeci Side Quest.
    const newExercise = await completeWorkout(accessToken, exerciseB.id);
    expect(newExercise.body.sideQuestCompleted).toBe(true);
  });

  it("ne dodeljuje nagradu dvaput za vec zavrsen side quest u istoj sesiji-lanca", async () => {
    const { accessToken, userId } = await registerUserWithLogNutritionKind("noduplicate");
    const [exerciseA] = await prisma.exercise.findMany({ take: 1 });
    if (!exerciseA) throw new Error("Nema seed vezbi u bazi");

    await completeWorkout(accessToken, exerciseA.id);
    const stateAfterFirst = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);

    // Drugi zavrsen trening sa ISTOM vezbom - side quest se ne zavrsava ponovo (progres 0/1 na
    // sledecem u lancu), pa se nagrada ne dodeljuje dvaput.
    await completeWorkout(accessToken, exerciseA.id);
    const stateAfterSecond = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);

    // Razlika u XP izmedju dva poziva je iskljucivo workout XP (150) - bez ponovnog Side Quest bonusa.
    expect(stateAfterSecond.body.progression.totalXp - stateAfterFirst.body.progression.totalXp).toBe(150);
    void userId;
  });
});
