import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Osnovno pracenje ishrane - nova domena bez XP/coin nagrade (vidi
 * apps/api/src/nutrition). Radi protiv prave lokalne Postgres baze, isti
 * obrazac kao ostali e2e testovi.
 */
describe("Nutrition (e2e)", () => {
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
    const username = `nutri${runId}${suffix}`;
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken };
  }

  const sampleEntry = (overrides: Partial<Record<string, unknown>> = {}) => ({
    date: "2026-03-10",
    mealType: "BREAKFAST",
    name: "Ovsena kasa sa bananom",
    calories: 350,
    proteinG: 15,
    carbsG: 55,
    fatG: 8,
    ...overrides,
  });

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/nutrition/entries").expect(401);
  });

  it("dnevni rezime je prazan (sve nule) kada nema unosa za dan", async () => {
    const { accessToken } = await registerUser("empty");

    const response = await request(app.getHttpServer())
      .get("/nutrition/entries")
      .query({ date: "2026-03-10" })
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      date: "2026-03-10",
      entries: [],
      totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    });
  });

  it("kreira unose i sabira ih u dnevni rezime", async () => {
    const { accessToken } = await registerUser("sum");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    await auth(request(app.getHttpServer()).post("/nutrition/entries")).send(sampleEntry()).expect(201);
    await auth(request(app.getHttpServer()).post("/nutrition/entries"))
      .send(sampleEntry({ mealType: "LUNCH", name: "Piletina sa pirinczem", calories: 650, proteinG: 45, carbsG: 70, fatG: 12 }))
      .expect(201);

    const response = await auth(request(app.getHttpServer()).get("/nutrition/entries")).query({ date: "2026-03-10" }).expect(200);

    expect(response.body.entries).toHaveLength(2);
    expect(response.body.totals).toEqual({ calories: 1000, proteinG: 60, carbsG: 125, fatG: 20 });
  });

  it("ne mesa unose razlicitih dana", async () => {
    const { accessToken } = await registerUser("days");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    await auth(request(app.getHttpServer()).post("/nutrition/entries")).send(sampleEntry({ date: "2026-03-10" })).expect(201);
    await auth(request(app.getHttpServer()).post("/nutrition/entries")).send(sampleEntry({ date: "2026-03-11" })).expect(201);

    const day1 = await auth(request(app.getHttpServer()).get("/nutrition/entries")).query({ date: "2026-03-10" }).expect(200);
    const day2 = await auth(request(app.getHttpServer()).get("/nutrition/entries")).query({ date: "2026-03-11" }).expect(200);

    expect(day1.body.entries).toHaveLength(1);
    expect(day2.body.entries).toHaveLength(1);
  });

  it("brise unos i vise ga ne vraca u dnevnom rezimeu", async () => {
    const { accessToken } = await registerUser("delete");
    const auth = (req: request.Test) => req.set("Authorization", `Bearer ${accessToken}`);

    const created = await auth(request(app.getHttpServer()).post("/nutrition/entries")).send(sampleEntry()).expect(201);
    await auth(request(app.getHttpServer()).delete(`/nutrition/entries/${created.body.id}`)).expect(204);

    const response = await auth(request(app.getHttpServer()).get("/nutrition/entries")).query({ date: "2026-03-10" }).expect(200);
    expect(response.body.entries).toEqual([]);
  });

  it("odbija brisanje tudjeg ili nepostojeceg unosa (404, ne curi da resurs postoji)", async () => {
    const owner = await registerUser("owner");
    const intruder = await registerUser("intruder");

    const created = await request(app.getHttpServer())
      .post("/nutrition/entries")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send(sampleEntry())
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/nutrition/entries/${created.body.id}`)
      .set("Authorization", `Bearer ${intruder.accessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete("/nutrition/entries/does-not-exist")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .expect(404);
  });

  it("odbija unos sa nevalidnim payload-om (400)", async () => {
    const { accessToken } = await registerUser("invalid");

    await request(app.getHttpServer())
      .post("/nutrition/entries")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(sampleEntry({ calories: -50 }))
      .expect(400);

    await request(app.getHttpServer())
      .post("/nutrition/entries")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(sampleEntry({ date: "10-03-2026" }))
      .expect(400);
  });
});
