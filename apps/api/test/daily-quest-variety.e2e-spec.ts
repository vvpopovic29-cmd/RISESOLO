import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { DAILY_QUEST_KINDS, selectDailyQuestKind, type DailyQuestKind } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Varijetet dnevnih questova (Faza "Questova" nadogradnja) - umesto jednog
 * hardkodovanog dnevnog questa, pool od WORKOUT_COMPLETE/LOG_NUTRITION kind-ova
 * bira se deterministicki po (userId, datum) - vidi @risesolo/domain
 * daily-quest-pool.ts. Ovi testovi proveravaju da: (1) oba kind-a stvarno mogu
 * biti izabrana, (2) svaki kind se zavrsava ISKLJUCIVO odgovarajucom akcijom
 * (workout vs. log ishrane), (3) nagrada za LOG_NUTRITION kind je ista
 * (XP/coins) ali NAMERNO ne dira streak (streak je vezan iskljucivo za
 * trening - vidi QuestsService.completeDailyQuestRewardIfPending).
 */
describe("Varijetet dnevnih questova (e2e)", () => {
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
    const username = `dqv${runId}${suffix}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  async function registerUserWithDailyQuestKind(suffix: string, desiredKind: DailyQuestKind): Promise<{ accessToken: string; userId: string }> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const user = await registerUser(`${suffix}${attempt}`);
      if (selectDailyQuestKind(user.userId, new Date()) === desiredKind) {
        return user;
      }
    }
    throw new Error(`Nije pronadjen korisnik sa dnevnim kind-om ${desiredKind} posle 50 pokusaja`);
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getTodayQuest(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/quests/today")).expect(200);
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  async function logNutritionEntry(accessToken: string): Promise<request.Response> {
    const today = new Date().toISOString().slice(0, 10);
    return auth(accessToken, request(app.getHttpServer()).post("/nutrition/entries"))
      .send({ date: today, mealType: "BREAKFAST", name: "Test obrok", calories: 400, proteinG: 30, carbsG: 40, fatG: 10 })
      .expect(201);
  }

  it("GET /quests/today vraca kind koji odgovara selectDailyQuestKind (deljeni izvor istine)", async () => {
    const { accessToken, userId } = await registerUser("kindmatch");
    const expectedKind = selectDailyQuestKind(userId, new Date());

    const quest = await getTodayQuest(accessToken);
    expect(quest.body.kind).toBe(expectedKind);
    expect(DAILY_QUEST_KINDS).toContain(quest.body.kind);
  });

  it("razliciti korisnici mogu dobiti razlicite dnevne quest kind-ove (varijetet, ne uvek isti)", async () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const { accessToken } = await registerUser(`variety${i}`);
      const quest = await getTodayQuest(accessToken);
      kinds.add(quest.body.kind);
    }
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("WORKOUT_COMPLETE kind: zavrsen trening zavrsava dnevni quest, log ishrane ga ne dira", async () => {
    const { accessToken } = await registerUserWithDailyQuestKind("workoutkind", "WORKOUT_COMPLETE");
    const exercise = await prisma.exercise.findFirstOrThrow();

    // Log ishrane pre treninga ne sme da zavrsi WORKOUT_COMPLETE quest.
    await logNutritionEntry(accessToken);
    const afterNutrition = await getTodayQuest(accessToken);
    expect(afterNutrition.body.status).toBe("AVAILABLE");

    // WORKOUT_COMPLETE (150) + dnevni quest (100) + Side Quest "nova vezba" bonus za PRVU
    // ikad zavrsenu vezbu ovog korisnika (50) = 300 XP; coins 15+25+10=50 (vidi side-quest.e2e-spec.ts).
    const completion = await completeWorkout(accessToken, exercise.id);
    expect(completion.body).toMatchObject({ questCompleted: true, xpGained: 300, coinsGained: 50 });

    const afterWorkout = await getTodayQuest(accessToken);
    expect(afterWorkout.body.status).toBe("COMPLETED");
  });

  it("LOG_NUTRITION kind: log ishrane zavrsava dnevni quest, trening ga ne dira", async () => {
    const { accessToken } = await registerUserWithDailyQuestKind("nutrikind", "LOG_NUTRITION");
    const exercise = await prisma.exercise.findFirstOrThrow();

    // Trening pre loga ishrane ne sme da zavrsi LOG_NUTRITION quest - workout XP (150) + Side
    // Quest "nova vezba" bonus za PRVU ikad zavrsenu vezbu ovog korisnika (50) = 200.
    const workoutFirst = await completeWorkout(accessToken, exercise.id);
    expect(workoutFirst.body).toMatchObject({ questCompleted: false, xpGained: 200 });

    const beforeNutrition = await getTodayQuest(accessToken);
    expect(beforeNutrition.body.status).toBe("AVAILABLE");

    await logNutritionEntry(accessToken);

    const afterNutrition = await getTodayQuest(accessToken);
    expect(afterNutrition.body.status).toBe("COMPLETED");
  });

  it("LOG_NUTRITION zavrsetak daje XP/coins nagradu ali NE dira streak (streak je iskljucivo trening)", async () => {
    const { accessToken, userId } = await registerUserWithDailyQuestKind("nutrireward", "LOG_NUTRITION");

    const stateBefore = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(stateBefore.body.progression).toMatchObject({ totalXp: 0, coins: 0, currentStreak: 0 });

    await logNutritionEntry(accessToken);

    const stateAfter = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    // DAILY_QUEST_COMPLETE nagrada: 100 XP + 15 coins (isti iznos kao workout-triggered put).
    expect(stateAfter.body.progression).toMatchObject({ totalXp: 100, coins: 15, currentStreak: 0 });

    void userId;
  });

  it("LOG_NUTRITION quest se ne zavrsava dvaput (drugi log istog dana ne dodeljuje nagradu ponovo)", async () => {
    const { accessToken } = await registerUserWithDailyQuestKind("nutridupe", "LOG_NUTRITION");

    await logNutritionEntry(accessToken);
    const stateAfterFirst = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(stateAfterFirst.body.progression.totalXp).toBe(100);

    await logNutritionEntry(accessToken);
    const stateAfterSecond = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(stateAfterSecond.body.progression.totalXp).toBe(100);
  });
});
