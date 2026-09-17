import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Istorija treninga + licni rekordi - GET /workouts/history i
 * GET /workouts/personal-records. Vidi apps/api/src/workouts/workout-history.service.ts.
 * Podaci vec postoje otkad postoji completion engine (WorkoutSession/WorkoutSet/XpEvent) -
 * ovo je cisto novi READ pogled na postojece tabele, bez migracije.
 */
describe("Workout history + personal records (e2e)", () => {
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
    const username = `wh${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  async function completeWorkout(
    token: string,
    exerciseId: string,
    reps: number,
    workoutId?: string,
  ): Promise<void> {
    const session = await auth(token, request(app.getHttpServer()).post("/workouts/sessions"))
      .send(workoutId ? { workoutId } : {})
      .expect(201);
    await auth(token, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps, completed: true })
      .expect(204);
    await auth(token, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(
      201,
    );
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/workouts/history").expect(401);
    await request(app.getHttpServer()).get("/workouts/personal-records").expect(401);
  });

  it("vraca prazne liste kad korisnik nema nijedan zavrsen trening", async () => {
    const { accessToken } = await registerUser("empty");

    const history = await auth(accessToken, request(app.getHttpServer()).get("/workouts/history")).expect(200);
    expect(history.body).toEqual([]);

    const records = await auth(accessToken, request(app.getHttpServer()).get("/workouts/personal-records")).expect(
      200,
    );
    expect(records.body).toEqual([]);
  });

  it("istorija prikazuje zavrsene treninge najnovije prvo, sa XP i sazetkom serija", async () => {
    const { accessToken } = await registerUser("hist");
    const exercise = await prisma.exercise.findFirstOrThrow();

    await completeWorkout(accessToken, exercise.id, 8);
    await completeWorkout(accessToken, exercise.id, 12);

    const history = await auth(accessToken, request(app.getHttpServer()).get("/workouts/history")).expect(200);
    expect(history.body).toHaveLength(2);

    // Najnoviji (12 ponavljanja) prvi.
    expect(history.body[0]).toMatchObject({
      workoutName: null,
      xpGained: 150,
      exercises: [
        expect.objectContaining({
          exerciseId: exercise.id,
          exerciseSlug: exercise.slug,
          exerciseName: exercise.name,
          setCount: 1,
          bestReps: 12,
          bestDurationSeconds: null,
        }),
      ],
    });
    expect(history.body[1]).toMatchObject({ xpGained: 150 });
    expect(new Date(history.body[0].completedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(history.body[1].completedAt).getTime(),
    );
  });

  it("istorija prikazuje ime template-a kad je sesija pokrenuta iz 'Mojih treninga'", async () => {
    const { accessToken } = await registerUser("tpl");
    const exercise = await prisma.exercise.findFirstOrThrow();

    const template = await auth(accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Push Day", exercises: [{ exerciseId: exercise.id }] })
      .expect(201);

    await completeWorkout(accessToken, exercise.id, 10, template.body.id);

    const history = await auth(accessToken, request(app.getHttpServer()).get("/workouts/history")).expect(200);
    expect(history.body[0]).toMatchObject({ workoutName: "Push Day" });
  });

  it("postuje limit query parametar", async () => {
    const { accessToken } = await registerUser("limit");
    const exercise = await prisma.exercise.findFirstOrThrow();

    await completeWorkout(accessToken, exercise.id, 5);
    await completeWorkout(accessToken, exercise.id, 6);
    await completeWorkout(accessToken, exercise.id, 7);

    const history = await auth(accessToken, request(app.getHttpServer()).get("/workouts/history?limit=2")).expect(
      200,
    );
    expect(history.body).toHaveLength(2);
  });

  it("licni rekordi vracaju najbolju ikad ulogovanu seriju po vezbi, preko svih sesija", async () => {
    const { accessToken } = await registerUser("pr");
    const exercise = await prisma.exercise.findFirstOrThrow();

    await completeWorkout(accessToken, exercise.id, 8);
    await completeWorkout(accessToken, exercise.id, 15);
    await completeWorkout(accessToken, exercise.id, 10);

    const records = await auth(accessToken, request(app.getHttpServer()).get("/workouts/personal-records")).expect(
      200,
    );
    expect(records.body).toEqual([
      expect.objectContaining({ exerciseId: exercise.id, bestReps: 15, bestDurationSeconds: null }),
    ]);
  });
});
