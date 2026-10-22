import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Konkurentni zahtevi i ekonomske invarijante: isti korisnik/resurs pogodjen
 * paralelno (dupli tap na mobilnom, retry posle sporog mreznog odgovora).
 * Invarijanta: XP/coins se NIKAD ne dodeljuju dvaput, a unique ogranicenja
 * (email, username, aktivna sesija) drze i pod paralelnim opterecenjem.
 */
describe("Concurrency & invariants (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
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
        username: `cc${runId}${suffix}`,
      })
      .expect(201);
    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  it("paralelna registracija istog email-a: tacno jedna uspeva, ostale 409", async () => {
    const email = `test-${runId}-race@risesolo.test`;
    const attempts = await Promise.all(
      [0, 1, 2, 3].map((n) =>
        request(app.getHttpServer())
          .post("/auth/register")
          .send({ email, password: "correct-horse-battery-staple", username: `race${runId}${n}` }),
      ),
    );

    const statuses = attempts.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(3);
    const created = attempts.find((r) => r.status === 201);
    createdUserIds.push(created?.body.user.id);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it("paralelno pokretanje dve sesije: jedna uspeva (201), druga 409, u bazi tacno jedna IN_PROGRESS", async () => {
    const { accessToken, userId } = await registerUser("start");

    const attempts = await Promise.all(
      [0, 1].map(() => auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({})),
    );

    expect(attempts.map((r) => r.status).sort()).toEqual([201, 409]);
    // Invarijanta koju korisnik oseca: ne sme da ostane vise od jedne aktivne sesije.
    expect(await prisma.workoutSession.count({ where: { userId, status: "IN_PROGRESS" } })).toBe(1);
  });

  it("paralelni zavrsetak istog treninga ne dodeljuje XP dvaput", async () => {
    const { accessToken, userId } = await registerUser("done");
    const exercise = await prisma.exercise.findFirstOrThrow();

    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId: exercise.id, setNumber: 1, reps: 10, completed: true })
      .expect(204);

    const attempts = await Promise.all(
      [0, 1, 2].map(() =>
        auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)),
      ),
    );

    const succeeded = attempts.filter((r) => r.status === 201);
    expect(succeeded).toHaveLength(1);
    expect(attempts.filter((r) => r.status !== 201).every((r) => r.status === 400 || r.status === 409)).toBe(true);

    const workoutXpEvents = await prisma.xpEvent.count({
      where: { userId, source: "WORKOUT_COMPLETE", sourceId: session.body.id },
    });
    expect(workoutXpEvents).toBe(1);

    const progression = await prisma.progression.findUniqueOrThrow({ where: { userId } });
    expect(progression.totalXp).toBe(succeeded[0]?.body.totalXp);
  });

  it("totalXp igraca uvek odgovara zbiru njegovih XpEvent-a (ekonomska invarijanta)", async () => {
    const { accessToken, userId } = await registerUser("sum");
    const exercise = await prisma.exercise.findFirstOrThrow();

    for (let i = 0; i < 3; i += 1) {
      const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
      await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
        .send({ exerciseId: exercise.id, setNumber: 1, reps: 10, completed: true })
        .expect(204);
      await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
    }

    const events = await prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } });
    const progression = await prisma.progression.findUniqueOrThrow({ where: { userId } });
    expect(progression.totalXp).toBe(events._sum.amount);
    expect(progression.coins).toBeGreaterThanOrEqual(0);
  });

  it("paralelno logovanje iste serije ne pravi duplikat (isti setNumber)", async () => {
    const { accessToken } = await registerUser("sets");
    const exercise = await prisma.exercise.findFirstOrThrow();
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);

    const attempts = await Promise.all(
      [0, 1, 2].map(() =>
        auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`)).send({
          exerciseId: exercise.id,
          setNumber: 1,
          reps: 10,
          completed: true,
        }),
      ),
    );

    // Nijedan zahtev ne sme da padne sa 5xx; u bazi ostaje tacno jedna serija sa tim brojem.
    expect(attempts.every((r) => r.status < 500)).toBe(true);
    expect(await prisma.workoutSet.count({ where: { sessionId: session.body.id, exerciseId: exercise.id, setNumber: 1 } })).toBe(1);
  });
});
