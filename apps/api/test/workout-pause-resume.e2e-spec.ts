import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Pause/Resume Trening (e2e) - najvise jedna IN_PROGRESS sesija po korisniku
 * (WorkoutsService.startSession sada baca 409 ako vec postoji jedna),
 * GET /workouts/sessions/active vraca pauziranu sesiju sa vec ulogovanim
 * serijama za hidraciju na klijentu, POST /workouts/sessions/:id/abandon
 * konacno koristi dormant ABANDONED status iz schema.prisma.
 */
describe("Pause/Resume Trening (e2e)", () => {
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

  it("GET /workouts/sessions/active vraca session:null kad korisnik nema pauziran trening", async () => {
    const { accessToken } = await registerUser("empty");
    const response = await request(app.getHttpServer())
      .get("/workouts/sessions/active")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ session: null, sets: [] });
  });

  it("pokrenuta sesija se vraca kao aktivna sa ulogovanim serijama, nastavak posle 'zatvaranja app-a'", async () => {
    const { accessToken } = await registerUser("resume");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);
    const exercise = await prisma.exercise.findFirstOrThrow();

    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    const sessionId = session.body.id;
    expect(session.body.status).toBe("IN_PROGRESS");

    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/sets`))
      .send({ exerciseId: exercise.id, setNumber: 1, reps: 12, completed: true })
      .expect(204);

    // "Zatvaranje app-a" - klijent gubi lokalno stanje, ali sesija zivi na serveru.
    const active = await auth(request(app.getHttpServer()).get("/workouts/sessions/active")).expect(200);
    expect(active.body.session.id).toBe(sessionId);
    expect(active.body.sets).toEqual([
      expect.objectContaining({
        exerciseId: exercise.id,
        exerciseSlug: exercise.slug,
        setNumber: 1,
        reps: 12,
        durationSeconds: null,
        completed: true,
      }),
    ]);

    // Nastavak - jos jedna serija ide na istu sesiju, pa se trening moze zavrsiti.
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/sets`))
      .send({ exerciseId: exercise.id, setNumber: 2, reps: 10, completed: true })
      .expect(204);
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/complete`)).expect(201);

    const afterComplete = await auth(request(app.getHttpServer()).get("/workouts/sessions/active")).expect(200);
    expect(afterComplete.body).toEqual({ session: null, sets: [] });
  });

  it("odbija pokretanje novog treninga dok postoji IN_PROGRESS sesija (409)", async () => {
    const { accessToken } = await registerUser("conflict");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(409);
  });

  it("odustajanje (abandon) oslobadja korisnika da pokrene novi trening", async () => {
    const { accessToken } = await registerUser("abandon");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    const sessionId = session.body.id;

    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/abandon`)).expect(204);

    const active = await auth(request(app.getHttpServer()).get("/workouts/sessions/active")).expect(200);
    expect(active.body).toEqual({ session: null, sets: [] });

    // Odustajanje ne trosi "jedna aktivna sesija" slot - novi trening moze da krene.
    await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
  });

  it("odbija duplo odustajanje od iste sesije (400 - vise nije IN_PROGRESS)", async () => {
    const { accessToken } = await registerUser("abandon2");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    const session = await auth(request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    const sessionId = session.body.id;

    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/abandon`)).expect(204);
    await auth(request(app.getHttpServer()).post(`/workouts/sessions/${sessionId}/abandon`)).expect(400);
  });

  it("odbija pristup abandon-u tudje sesije (404, ne curi da resurs postoji)", async () => {
    const owner = await registerUser("aowner");
    const intruder = await registerUser("aintruder");

    const session = await request(app.getHttpServer())
      .post("/workouts/sessions")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/workouts/sessions/${session.body.id}/abandon`)
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .expect(404);
  });
});
