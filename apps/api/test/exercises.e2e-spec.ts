import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { exerciseSchema } from "@risesolo/validation";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * E2E za katalog vezbi (GET /exercises, GET /exercises/:slug) protiv seed-ovane
 * baze. Proverava auth, filtere, validaciju query-ja, 404 i da svaki red iz
 * baze prolazi kroz ugovor (`exerciseSchema`) koji koristi mobilna aplikacija.
 */
describe("Exercises API (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        email: `test-${runId}-ex@risesolo.test`,
        password: "correct-horse-battery-staple",
        username: `exer${runId}`,
      })
      .expect(201);
    createdUserIds.push(response.body.user.id);
    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
    await app.close();
  });

  const get = (path: string) => request(app.getHttpServer()).get(path).set("Authorization", `Bearer ${accessToken}`);

  it("odbija pristup bez tokena (401) na listi i na detalju", async () => {
    await request(app.getHttpServer()).get("/exercises").expect(401);
    await request(app.getHttpServer()).get("/exercises/chest-wall-push-up").expect(401);
  });

  it("lista vraca celu seed biblioteku i svaki red prolazi exerciseSchema", async () => {
    const response = await get("/exercises").expect(200);
    const total = await prisma.exercise.count();

    expect(response.body).toHaveLength(total);
    expect(total).toBeGreaterThanOrEqual(200);
    for (const exercise of response.body) {
      expect(exerciseSchema.safeParse(exercise).success).toBe(true);
    }
  });

  it("filtrira po tipu - SKILL vezbe imaju skill-* progresiju", async () => {
    const response = await get("/exercises?type=SKILL").expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    for (const exercise of response.body) {
      expect(exercise.type).toBe("SKILL");
      expect(exercise.progressionChain).toMatch(/^skill-/);
    }
  });

  it("filtrira po kategoriji i tezini istovremeno (AND semantika)", async () => {
    const response = await get("/exercises?category=CHEST&difficulty=BEGINNER").expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    for (const exercise of response.body) {
      expect(exercise).toMatchObject({ category: "CHEST", difficulty: "BEGINNER" });
    }
  });

  it("kombinacija filtera bez rezultata vraca prazan niz (200, ne 404)", async () => {
    const response = await get("/exercises?category=DOES_NOT_EXIST").expect(200);

    expect(response.body).toEqual([]);
  });

  it("odbija nepoznatu vrednost enum filtera (400)", async () => {
    await get("/exercises?type=CARDIO").expect(400);
    await get("/exercises?difficulty=EXPERT").expect(400);
  });

  it("lista je grupisana po kategoriji, a unutar kategorije sortirana po progressionOrder", async () => {
    const response = await get("/exercises").expect(200);
    const rows = response.body as Array<{ category: string; progressionOrder: number | null }>;

    const categoryRuns = rows.filter((row, i) => i === 0 || row.category !== (rows[i - 1] as { category: string }).category);
    expect(new Set(categoryRuns.map((row) => row.category)).size).toBe(categoryRuns.length);

    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1] as (typeof rows)[number];
      const curr = rows[i] as (typeof rows)[number];
      // Postgres ASC stavlja NULL poslednje.
      if (prev.category === curr.category && prev.progressionOrder !== null && curr.progressionOrder !== null) {
        expect(curr.progressionOrder).toBeGreaterThanOrEqual(prev.progressionOrder);
      }
    }
  });

  it("detalj po slug-u vraca punu vezbu koja se poklapa sa listom", async () => {
    const list = await get("/exercises?category=CHEST").expect(200);
    const target = list.body[0];

    const detail = await get(`/exercises/${target.slug}`).expect(200);

    expect(detail.body).toEqual(target);
    expect(exerciseSchema.safeParse(detail.body).success).toBe(true);
  });

  it("nepoznat slug vraca 404 sa porukom", async () => {
    const response = await get("/exercises/ovo-ne-postoji").expect(404);

    expect(response.body.message).toContain("ovo-ne-postoji");
  });

  it("vezba je reps-bazirana ili hold-bazirana (ugovor za workout ekran)", async () => {
    const response = await get("/exercises").expect(200);

    for (const exercise of response.body) {
      expect((exercise.defaultReps === null) !== (exercise.holdSeconds === null)).toBe(true);
    }
  });
});
