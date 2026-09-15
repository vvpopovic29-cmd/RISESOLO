import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Bez ANTHROPIC_API_KEY (ni lokalno ni u CI - vidi .github/workflows/ci.yml)
 * generate mora gracefully vratiti 503, ne oboriti aplikaciju - vidi
 * apps/api/src/ai/ai.service.ts. List/get rade nezavisno od AI kljuca.
 */
describe("Training plans (e2e)", () => {
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
    const username = `tp${runId}${suffix}`;
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken };
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/training-plans").expect(401);
  });

  it("lista planova je prazna za novog korisnika", async () => {
    const { accessToken } = await registerUser("empty");

    const response = await request(app.getHttpServer())
      .get("/training-plans")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("odbija generate zahtev sa neispravnim daysPerWeek (400, pre poziva AI-a)", async () => {
    const { accessToken } = await registerUser("invalid");

    await request(app.getHttpServer())
      .post("/training-plans/generate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ daysPerWeek: 9 })
      .expect(400);
  });

  it("generate vraca 503 kada ANTHROPIC_API_KEY nije podesen (bez pucanja aplikacije)", async () => {
    const { accessToken } = await registerUser("nokey");

    await request(app.getHttpServer())
      .post("/training-plans/generate")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ daysPerWeek: 3 })
      .expect(503);
  });

  it("getById vraca 404 za nepostojeci plan", async () => {
    const { accessToken } = await registerUser("missing");

    await request(app.getHttpServer())
      .get("/training-plans/does-not-exist")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });

  it("odbija pristup tudjem planu (404, ne curi da resurs postoji)", async () => {
    const owner = await registerUser("planowner");
    const intruder = await registerUser("planintruder");

    const plan = await prisma.trainingPlan.create({
      data: {
        userId: (await prisma.profile.findFirstOrThrow({ where: { username: { contains: `planowner` } } })).userId,
        title: "Test plan",
        daysPerWeek: 3,
        content: { days: [{ day: 1, focus: "Full body", exercises: [{ exerciseSlug: "chest-wall-push-up", sets: 3, reps: "8-12" }] }] },
        model: "test-model",
      },
    });

    await request(app.getHttpServer())
      .get(`/training-plans/${plan.id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/training-plans/${plan.id}`)
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .expect(404);
  });
});
