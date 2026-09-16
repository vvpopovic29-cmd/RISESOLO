import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Penalty System - propusten DAILY quest (ostao AVAILABLE/IN_PROGRESS iz
 * proslog dana) postaje EXPIRED i kosta coins na sledecem GET /players/me
 * pozivu (vidi apps/api/src/quests/quests.service.ts expirePastDueDailyQuests).
 * Radi protiv prave lokalne Postgres baze, isti obrazac kao ostali e2e testovi.
 */
describe("Penalty system (e2e)", () => {
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
    const username = `pen${runId}${suffix}`;
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  /** UTC ponoc `days` dana pre danas - isto normalizovanje kao startOfUtcDay. */
  function utcDaysAgo(days: number): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  }

  async function createPastDueDailyQuest(userId: string, daysAgo: number, status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED") {
    return prisma.quest.create({
      data: {
        userId,
        date: utcDaysAgo(daysAgo),
        type: "DAILY",
        title: "Zavrsi danasnji trening",
        description: null,
        targetReps: null,
        targetSets: 3,
        xpReward: 100,
        coinReward: 15,
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
  }

  it("kaznjava propusten dnevni quest kada se prvi put primeti (GET /players/me)", async () => {
    const { accessToken, userId } = await registerUser("basic");
    await prisma.progression.update({ where: { userId }, data: { coins: 100 } });
    const quest = await createPastDueDailyQuest(userId, 1, "AVAILABLE");

    const response = await request(app.getHttpServer())
      .get("/players/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.penalty).toEqual({ applied: true, missedQuestCount: 1, coinsLost: 20 });
    expect(response.body.progression.coins).toBe(80);

    const updatedQuest = await prisma.quest.findUniqueOrThrow({ where: { id: quest.id } });
    expect(updatedQuest.status).toBe("EXPIRED");
  });

  it("ne kaznjava dvaput isti propusteni quest", async () => {
    const { accessToken, userId } = await registerUser("noduplicate");
    await prisma.progression.update({ where: { userId }, data: { coins: 100 } });
    await createPastDueDailyQuest(userId, 1, "AVAILABLE");

    const first = await request(app.getHttpServer()).get("/players/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(first.body.penalty.applied).toBe(true);
    expect(first.body.progression.coins).toBe(80);

    const second = await request(app.getHttpServer()).get("/players/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(second.body.penalty).toEqual({ applied: false, missedQuestCount: 0, coinsLost: 0 });
    expect(second.body.progression.coins).toBe(80);
  });

  it("ne kaznjava vec zavrsen (COMPLETED) quest iz proslog dana", async () => {
    const { accessToken, userId } = await registerUser("completed");
    await prisma.progression.update({ where: { userId }, data: { coins: 100 } });
    await createPastDueDailyQuest(userId, 1, "COMPLETED");

    const response = await request(app.getHttpServer()).get("/players/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(response.body.penalty).toEqual({ applied: false, missedQuestCount: 0, coinsLost: 0 });
    expect(response.body.progression.coins).toBe(100);
  });

  it("klampuje coins na 0 kada je kazna veca od trenutnog stanja", async () => {
    const { accessToken, userId } = await registerUser("clamp");
    await prisma.progression.update({ where: { userId }, data: { coins: 5 } });
    await createPastDueDailyQuest(userId, 1, "AVAILABLE");

    const response = await request(app.getHttpServer()).get("/players/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(response.body.penalty).toEqual({ applied: true, missedQuestCount: 1, coinsLost: 5 });
    expect(response.body.progression.coins).toBe(0);
  });

  it("kaznjava sve propustene dane odjednom ako aplikacija nije otvarana vise dana", async () => {
    const { accessToken, userId } = await registerUser("multi");
    await prisma.progression.update({ where: { userId }, data: { coins: 100 } });
    await createPastDueDailyQuest(userId, 2, "AVAILABLE");
    await createPastDueDailyQuest(userId, 1, "IN_PROGRESS");

    const response = await request(app.getHttpServer()).get("/players/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(response.body.penalty).toEqual({ applied: true, missedQuestCount: 2, coinsLost: 40 });
    expect(response.body.progression.coins).toBe(60);
  });

  it("ne dira totalXp niti stat poene - samo coins", async () => {
    const { accessToken, userId } = await registerUser("xpsafe");
    await prisma.progression.update({ where: { userId }, data: { coins: 100, totalXp: 500 } });
    await createPastDueDailyQuest(userId, 1, "AVAILABLE");

    const response = await request(app.getHttpServer()).get("/players/me").set("Authorization", `Bearer ${accessToken}`).expect(200);
    expect(response.body.progression.totalXp).toBe(500);
  });
});
