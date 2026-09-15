import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Boss Quest = nedeljni izazov (3 zavrsena treninga te ISO nedelje) - vidi
 * apps/api/src/quests/quests.service.ts i workouts.service.ts. Radi protiv
 * prave lokalne Postgres baze, isti obrazac kao core-gameplay-loop.e2e-spec.ts.
 */
describe("Boss quest (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);

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

  async function registerUser(suffix: string): Promise<{ accessToken: string }> {
    const email = `test-${runId}-${suffix}@risesolo.test`;
    const username = `boss${runId}${suffix}`;
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken };
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);
    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  it("generise AVAILABLE boss quest sa progres=0 za novog korisnika, idempotentno", async () => {
    const { accessToken } = await registerUser("fresh");

    const first = await request(app.getHttpServer())
      .get("/quests/boss")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .get("/quests/boss")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(first.body.id).toBe(second.body.id);
    expect(first.body).toMatchObject({
      status: "AVAILABLE",
      progress: 0,
      targetSessions: 3,
      xpReward: 500,
      coinReward: 150,
    });
  });

  it("zavrsava se na trecem zavrsenom treningu te nedelje i dodeljuje bonus nagradu", async () => {
    const { accessToken } = await registerUser("loop");
    const exercise = await prisma.exercise.findFirstOrThrow();

    const first = await completeWorkout(accessToken, exercise.id);
    // Prvi trening u danu: workout (150) + dnevni quest (100) = 250. Boss quest jos nije zavrsen.
    expect(first.body).toMatchObject({ xpGained: 250, bossQuestCompleted: false });

    const second = await completeWorkout(accessToken, exercise.id);
    // Dnevni quest je vec zavrsen - samo workout XP (150).
    expect(second.body).toMatchObject({ xpGained: 150, bossQuestCompleted: false });

    const third = await completeWorkout(accessToken, exercise.id);
    // Treci zavrseni trening ove nedelje -> boss quest bonus (500 XP + 150 coins) uz workout (150).
    expect(third.body).toMatchObject({ xpGained: 650, coinsGained: 175, bossQuestCompleted: true });

    const bossQuest = await request(app.getHttpServer())
      .get("/quests/boss")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(bossQuest.body).toMatchObject({ status: "COMPLETED", progress: 3, targetSessions: 3 });

    // Cetvrti trening ne dodeljuje boss nagradu ponovo (vec COMPLETED).
    const fourth = await completeWorkout(accessToken, exercise.id);
    expect(fourth.body).toMatchObject({ xpGained: 150, bossQuestCompleted: false });
  });
});
