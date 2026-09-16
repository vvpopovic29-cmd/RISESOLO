import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * "Moji treninzi" - imenovana kolekcija vezbi (Workout model). Vidi
 * apps/api/src/workouts/workout-templates.service.ts.
 */
describe("Workout templates (e2e)", () => {
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
    const username = `wt${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  async function getTwoExercises(): Promise<[string, string]> {
    const [first, second] = await prisma.exercise.findMany({ take: 2 });
    if (!first || !second) {
      throw new Error("Test zahteva bar 2 seed-ovane vezbe u bazi");
    }
    return [first.id, second.id];
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/workouts/templates").expect(401);
    await request(app.getHttpServer()).post("/workouts/templates").send({}).expect(401);
  });

  it("kreira template i vraca hidrirane vezbe sortirane po order-u", async () => {
    const { accessToken } = await registerUser("create");
    const [exerciseIdA, exerciseIdB] = await getTwoExercises();

    const response = await auth(accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({
        name: "Push dan",
        exercises: [
          { exerciseId: exerciseIdA, targetSets: 4 },
          { exerciseId: exerciseIdB },
        ],
      })
      .expect(201);

    expect(response.body.name).toBe("Push dan");
    expect(response.body.exerciseCount).toBe(2);
    expect(response.body.exercises).toEqual([
      expect.objectContaining({ order: 1, targetSets: 4, exercise: expect.objectContaining({ id: exerciseIdA }) }),
      expect.objectContaining({ order: 2, targetSets: null, exercise: expect.objectContaining({ id: exerciseIdB }) }),
    ]);
  });

  it("odbacuje kreiranje sa nepostojecim exerciseId (400)", async () => {
    const { accessToken } = await registerUser("badexercise");

    await auth(accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Los template", exercises: [{ exerciseId: "does-not-exist" }] })
      .expect(400);
  });

  it("odbacuje kreiranje bez vezbi (400)", async () => {
    const { accessToken } = await registerUser("noexercises");

    await auth(accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Prazan template", exercises: [] })
      .expect(400);
  });

  it("vraca listu sopstvenih template-a (ne i tudjih)", async () => {
    const owner = await registerUser("list-owner");
    const other = await registerUser("list-other");
    const [exerciseId] = await getTwoExercises();

    await auth(owner.accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Moj template", exercises: [{ exerciseId }] })
      .expect(201);

    const ownerList = await auth(owner.accessToken, request(app.getHttpServer()).get("/workouts/templates")).expect(200);
    expect(ownerList.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Moj template", exerciseCount: 1 })]),
    );

    const otherList = await auth(other.accessToken, request(app.getHttpServer()).get("/workouts/templates")).expect(200);
    expect(otherList.body).toEqual([]);
  });

  it("GET/DELETE tudjeg template-a vraca 404 (ne curi informaciju)", async () => {
    const owner = await registerUser("owner-priv");
    const intruder = await registerUser("intruder-priv");
    const [exerciseId] = await getTwoExercises();

    const created = await auth(owner.accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Privatan template", exercises: [{ exerciseId }] })
      .expect(201);

    await auth(intruder.accessToken, request(app.getHttpServer()).get(`/workouts/templates/${created.body.id}`)).expect(404);
    await auth(intruder.accessToken, request(app.getHttpServer()).delete(`/workouts/templates/${created.body.id}`)).expect(404);

    // Template i dalje postoji za vlasnika (tudji pokusaj brisanja nije imao efekta).
    await auth(owner.accessToken, request(app.getHttpServer()).get(`/workouts/templates/${created.body.id}`)).expect(200);
  });

  it("brise sopstveni template", async () => {
    const { accessToken } = await registerUser("delete-owner");
    const [exerciseId] = await getTwoExercises();

    const created = await auth(accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Za brisanje", exercises: [{ exerciseId }] })
      .expect(201);

    await auth(accessToken, request(app.getHttpServer()).delete(`/workouts/templates/${created.body.id}`)).expect(204);
    await auth(accessToken, request(app.getHttpServer()).get(`/workouts/templates/${created.body.id}`)).expect(404);
  });

  it("pokretanje sesije sa workoutId povezuje sesiju sa template-om", async () => {
    const { accessToken, userId } = await registerUser("start-session");
    const [exerciseId] = await getTwoExercises();

    const template = await auth(accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Za sesiju", exercises: [{ exerciseId }] })
      .expect(201);

    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions"))
      .send({ workoutId: template.body.id })
      .expect(201);

    const row = await prisma.workoutSession.findUnique({ where: { id: session.body.id } });
    expect(row).toMatchObject({ userId, workoutId: template.body.id });
  });

  it("pokretanje sesije sa tudjim workoutId vraca 404", async () => {
    const owner = await registerUser("session-owner");
    const intruder = await registerUser("session-intruder");
    const [exerciseId] = await getTwoExercises();

    const template = await auth(owner.accessToken, request(app.getHttpServer()).post("/workouts/templates"))
      .send({ name: "Tudj template", exercises: [{ exerciseId }] })
      .expect(201);

    await auth(intruder.accessToken, request(app.getHttpServer()).post("/workouts/sessions"))
      .send({ workoutId: template.body.id })
      .expect(404);
  });
});
