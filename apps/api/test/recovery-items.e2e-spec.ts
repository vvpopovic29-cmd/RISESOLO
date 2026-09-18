import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Inventory (B2) - Recovery Items, sesti izvor. Katalog je UNAPRED vidljiv
 * kao Guild Item (name/description se uvek salju), AUTOMATSKI se dodeljuje
 * (GET-only, isti evaluate-and-discover princip kao Hidden/Guild), ali na
 * osnovu LICNOG obrasca odmora izmedju treninga (razmak u danima izmedju
 * dva zavrsena treninga) - ne guild aktivnosti, ne nivoa. Testovi seed-uju
 * WorkoutSession redove DIREKTNO u bazi sa kontrolisanim completedAt
 * datumima (isti princip kao ostali Inventory e2e testovi) da bi precizno
 * konstruisali razmake, bez potrebe da se stvarno cekaju dani.
 */
describe("Inventory - Recovery Items (e2e)", () => {
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
    const username = `ri${runId}${suffix}${userSeq}`.slice(0, 24);
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

  /** Kreira zavrsenu WorkoutSession direktno u bazi na dati (UTC ponoc) dan - workoutId ostaje null, nista drugo nije relevantno za Recovery uslove. */
  async function seedCompletedSession(userId: string, daysFromEpochStart: number): Promise<void> {
    const completedAt = new Date(Date.UTC(2026, 0, 1 + daysFromEpochStart, 12, 0, 0));
    await prisma.workoutSession.create({
      data: { userId, status: "COMPLETED", startedAt: completedAt, completedAt },
    });
  }

  async function getRecoveryItems(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory/recovery")).expect(200);
  }

  function findItem(body: unknown[], id: string): { id: string; discovered: boolean; name: string; description: string } {
    const item = (body as Array<{ id: string }>).find((entry) => entry.id === id);
    if (!item) throw new Error(`Item ${id} nije u odgovoru`);
    return item as { id: string; discovered: boolean; name: string; description: string };
  }

  it("vraca ceo katalog (unapred vidljiv, name/description uvek prisutni) sa discovered:false za svez nalog", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getRecoveryItems(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
      expect(typeof item.name).toBe("string");
      expect(typeof item.description).toBe("string");
    }
  });

  it("ne otkljucava nista kada su treninzi na uzastopnim danima (nema pravog odmora)", async () => {
    const { accessToken, userId } = await registerUser("noRest");
    await seedCompletedSession(userId, 0);
    await seedCompletedSession(userId, 1);
    await seedCompletedSession(userId, 2);

    const response = await getRecoveryItems(accessToken);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
    }
  });

  it("otkljucava FIRST_REST_DAY kada je razmak izmedju dva treninga tacno 2 dana", async () => {
    const { accessToken, userId } = await registerUser("gap2");
    await seedCompletedSession(userId, 0);
    await seedCompletedSession(userId, 2);

    const response = await getRecoveryItems(accessToken);
    expect(findItem(response.body, "FIRST_REST_DAY").discovered).toBe(true);
    expect(findItem(response.body, "THE_COMEBACK").discovered).toBe(false);
  });

  it("otkljucava FIRST_REST_DAY i THE_COMEBACK kada je razmak 5+ dana", async () => {
    const { accessToken, userId } = await registerUser("gap5");
    await seedCompletedSession(userId, 0);
    await seedCompletedSession(userId, 5);

    const response = await getRecoveryItems(accessToken);
    expect(findItem(response.body, "FIRST_REST_DAY").discovered).toBe(true);
    expect(findItem(response.body, "THE_COMEBACK").discovered).toBe(true);
    expect(findItem(response.body, "LONG_HAUL_RETURN").discovered).toBe(false);
  });

  it("otkljucava LONG_HAUL_RETURN kada je razmak 10+ dana", async () => {
    const { accessToken, userId } = await registerUser("gap10");
    await seedCompletedSession(userId, 0);
    await seedCompletedSession(userId, 10);

    const response = await getRecoveryItems(accessToken);
    expect(findItem(response.body, "LONG_HAUL_RETURN").discovered).toBe(true);
  });

  it("otkljucava RESTED_ROUTINE tek nakon 3 odmorena razmaka (svaki >= 2 dana)", async () => {
    const { accessToken, userId } = await registerUser("routine");
    await seedCompletedSession(userId, 0);
    await seedCompletedSession(userId, 2);
    await seedCompletedSession(userId, 4);
    await seedCompletedSession(userId, 6);

    const response = await getRecoveryItems(accessToken);
    expect(findItem(response.body, "RESTED_ROUTINE").discovered).toBe(true);
  });

  it("otkljucava MARATHON_PATIENCE tek pri 30+ dana treninga SA bar jednim odmorenim razmakom", async () => {
    const { accessToken, userId } = await registerUser("marathon");
    for (let day = 0; day < 29; day += 1) {
      await seedCompletedSession(userId, day);
    }
    await seedCompletedSession(userId, 31);

    const response = await getRecoveryItems(accessToken);
    expect(findItem(response.body, "MARATHON_PATIENCE").discovered).toBe(true);
  });

  it("drugi GET ne pravi duplikate redova za vec otkrivene predmete", async () => {
    const { accessToken, userId } = await registerUser("idempotent");
    await seedCompletedSession(userId, 0);
    await seedCompletedSession(userId, 2);

    await getRecoveryItems(accessToken);
    await getRecoveryItems(accessToken);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, source: "RECOVERY" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemId).toBe("FIRST_REST_DAY");
  });
});
