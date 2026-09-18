import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Inventory (B2) - Hidden Items. Za razliku od Achievements (pragovi vidljivi
 * unapred), uslovi otkljucavanja su NAMERNO tajni - vidi @risesolo/domain
 * hidden-item.ts. Testovi direktno seed-uju DB stanje (isti princip kao
 * main-quest.e2e-spec.ts seedStat) da izbegnu stotine stvarnih HTTP round-
 * trip-ova za dostizanje pragova (npr. 5000 coins, 100 ponavljanja u sesiji).
 * `evaluateAndDiscover` se zove SINHRONO unutar GET /inventory (lazy catch-
 * up, isti princip kao AchievementsService.listForUser), pa nema trke sa
 * fire-and-forget pozivom iz WorkoutsService.
 */
describe("Inventory - Hidden Items (e2e)", () => {
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
    const username = `inv${runId}${suffix}${userSeq}`.slice(0, 24);
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

  async function getInventory(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory")).expect(200);
  }

  function findItem(body: unknown[], id: string): { id: string; discovered: boolean; name: string | null } {
    const item = (body as Array<{ id: string }>).find((entry) => entry.id === id);
    if (!item) throw new Error(`Item ${id} nije u odgovoru`);
    return item as { id: string; discovered: boolean; name: string | null };
  }

  it("vraca svih 5 Hidden Item-a kao neotkrivene za sveze registrovanog korisnika, bez name/description", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getInventory(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
      expect(item.name).toBeNull();
      expect(item.description).toBeNull();
      expect(item.discoveredAt).toBeNull();
      expect(item.source).toBe("HIDDEN");
    }
  });

  it("otkriva MIDNIGHT_WARRIOR kada postoji zavrsena sesija sa completedAt izmedju ponoci i 4h (UTC)", async () => {
    const { accessToken, userId } = await registerUser("midnight");
    const midnight = new Date();
    midnight.setUTCHours(2, 30, 0, 0);
    await prisma.workoutSession.create({
      data: { userId, status: "COMPLETED", startedAt: midnight, completedAt: midnight },
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "MIDNIGHT_WARRIOR").discovered).toBe(true);
    expect(findItem(response.body, "MIDNIGHT_WARRIOR").name).toBe("Nocni Ratnik");
  });

  it("ne otkriva MIDNIGHT_WARRIOR za sesiju zavrsenu van tog vremenskog prozora", async () => {
    const { accessToken, userId } = await registerUser("noon");
    const noon = new Date();
    noon.setUTCHours(12, 0, 0, 0);
    await prisma.workoutSession.create({
      data: { userId, status: "COMPLETED", startedAt: noon, completedAt: noon },
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "MIDNIGHT_WARRIOR").discovered).toBe(false);
  });

  it("otkriva CENTURY_CLUB kada zbir ponavljanja odradjenih serija u JEDNOJ sesiji dostigne 100", async () => {
    const { accessToken, userId } = await registerUser("century");
    const exercise = await prisma.exercise.findFirstOrThrow();
    const session = await prisma.workoutSession.create({
      data: { userId, status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.workoutSet.createMany({
      data: [
        { sessionId: session.id, exerciseId: exercise.id, setNumber: 1, reps: 50, completed: true },
        { sessionId: session.id, exerciseId: exercise.id, setNumber: 2, reps: 50, completed: true },
      ],
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "CENTURY_CLUB").discovered).toBe(true);
  });

  it("ne broji nezavrsene (completed: false) serije za CENTURY_CLUB", async () => {
    const { accessToken, userId } = await registerUser("incomplete");
    const exercise = await prisma.exercise.findFirstOrThrow();
    const session = await prisma.workoutSession.create({
      data: { userId, status: "COMPLETED", completedAt: new Date() },
    });
    await prisma.workoutSet.create({
      data: { sessionId: session.id, exerciseId: exercise.id, setNumber: 1, reps: 100, completed: false },
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "CENTURY_CLUB").discovered).toBe(false);
  });

  it("otkriva BALANCED_WARRIOR kada su svi atributi >= 15 i medjusobno na razlici <= 2", async () => {
    const { accessToken, userId } = await registerUser("balanced");
    await prisma.playerStats.update({
      where: { userId },
      data: { strength: 16, agility: 17, endurance: 15, vitality: 16, intelligence: 17 },
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "BALANCED_WARRIOR").discovered).toBe(true);
  });

  it("ne otkriva BALANCED_WARRIOR kada je jedan atribut previse nizak, cak i ako su ostali visoki", async () => {
    const { accessToken, userId } = await registerUser("unbalanced");
    await prisma.playerStats.update({
      where: { userId },
      data: { strength: 30, agility: 30, endurance: 30, vitality: 30, intelligence: 1 },
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "BALANCED_WARRIOR").discovered).toBe(false);
  });

  it("otkriva COIN_HOARDER pri 5000+ coins-a", async () => {
    const { accessToken, userId } = await registerUser("hoarder");
    await prisma.progression.update({ where: { userId }, data: { coins: 5000 } });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "COIN_HOARDER").discovered).toBe(true);
  });

  it("otkriva UNBROKEN_DISCIPLINE uz 7+ dana niza i nula ikad primenjenih PENALTY questova", async () => {
    const { accessToken, userId } = await registerUser("disciplined");
    await prisma.progression.update({ where: { userId }, data: { currentStreak: 7 } });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "UNBROKEN_DISCIPLINE").discovered).toBe(true);
  });

  it("ne otkriva UNBROKEN_DISCIPLINE ako je korisnik ikad bio kaznjen, cak i uz dovoljan trenutni niz", async () => {
    const { accessToken, userId } = await registerUser("relapsed");
    await prisma.progression.update({ where: { userId }, data: { currentStreak: 10 } });
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await prisma.quest.create({
      data: {
        userId,
        date: yesterday,
        type: "PENALTY",
        kind: "REDEMPTION_WORKOUT",
        title: "Iskupljenje",
        targetSets: 2,
        xpReward: 50,
        coinReward: 10,
      },
    });

    const response = await getInventory(accessToken);
    expect(findItem(response.body, "UNBROKEN_DISCIPLINE").discovered).toBe(false);
  });

  it("otkriveni predmet ostaje otkriven i posle GET-a cak i ako uslov vise nije ispunjen (persistuje se cinjenica otkrivanja)", async () => {
    const { accessToken, userId } = await registerUser("persisted");
    await prisma.progression.update({ where: { userId }, data: { coins: 5000 } });
    const first = await getInventory(accessToken);
    expect(findItem(first.body, "COIN_HOARDER").discovered).toBe(true);

    await prisma.progression.update({ where: { userId }, data: { coins: 0 } });
    const second = await getInventory(accessToken);
    expect(findItem(second.body, "COIN_HOARDER").discovered).toBe(true);
  });

  it("otkrivanje je idempotentno - drugi GET ne pravi duplikat reda u bazi", async () => {
    const { accessToken, userId } = await registerUser("idempotent");
    await prisma.progression.update({ where: { userId }, data: { coins: 5000 } });
    await getInventory(accessToken);
    await getInventory(accessToken);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, itemId: "COIN_HOARDER" } });
    expect(rows).toHaveLength(1);
  });
});
