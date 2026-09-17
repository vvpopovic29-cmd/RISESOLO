import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { selectWeeklyQuestKind, type WeeklyQuestKind } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { startOfIsoWeek } from "../src/common/date";

/**
 * Nedeljni quest - drugi tier sedmicnog izazova, ODVOJEN od Boss Quest-a
 * (koji je iskljucivo "N zavrsenih treninga ove nedelje"). Progres se
 * NAMERNO izvodi iz vec postojecih podataka (XpEvent/NutritionEntry), a
 * zavrsava se LAZY na GET /quests/weekly - vidi
 * apps/api/src/quests/quests.service.ts. Radi protiv prave lokalne
 * Postgres baze, isti obrazac kao boss-quest.e2e-spec.ts.
 */
describe("Nedeljni quest (e2e)", () => {
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
    const username = `wq${runId}${suffix}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  /**
   * Isti princip kao registerUserWithDailyQuestKind (vidi boss-quest.e2e-spec.ts) -
   * registruje korisnike dok hash ne izabere zeljeni nedeljni kind za ovu ISO nedelju.
   */
  async function registerUserWithWeeklyQuestKind(suffix: string, desiredKind: WeeklyQuestKind): Promise<{ accessToken: string; userId: string }> {
    const weekStart = startOfIsoWeek(new Date());
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const user = await registerUser(`${suffix}${attempt}`);
      if (selectWeeklyQuestKind(user.userId, weekStart) === desiredKind) {
        return user;
      }
    }
    throw new Error(`Nije pronadjen korisnik sa nedeljnim kind-om ${desiredKind} posle 50 pokusaja`);
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getWeeklyQuest(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/quests/weekly")).expect(200);
  }

  async function getPlayerState(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
  }

  /**
   * Direktan upis u XpEvent (izvor irelevantan za test) - simulira vec
   * osvojen XP te nedelje. Progression.totalXp azuriran USPOREDO (isti
   * princip kao stvarni granting putevi - vidi QuestsService.grantQuestReward) -
   * inace bi ostao van sinhronizacije sa XpEvent zbirom.
   */
  async function seedXpEvent(userId: string, amount: number): Promise<void> {
    await prisma.xpEvent.create({
      data: { userId, source: "WORKOUT_COMPLETE", sourceId: `seed-${Math.random().toString(36).slice(2)}`, amount },
    });
    await prisma.progression.update({ where: { userId }, data: { totalXp: { increment: amount } } });
  }

  /** Direktan upis NutritionEntry za dati dan te ISO nedelje (offset u danima od ponedeljka). */
  async function seedNutritionEntry(userId: string, dayOffset: number): Promise<void> {
    const weekStart = startOfIsoWeek(new Date());
    const date = new Date(weekStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    await prisma.nutritionEntry.create({
      data: { userId, date, mealType: "SNACK", name: "Test unos", calories: 100, proteinG: 5, carbsG: 10, fatG: 2 },
    });
  }

  it("generise AVAILABLE nedeljni quest za novog korisnika, idempotentno", async () => {
    const { accessToken } = await registerUser("fresh");

    const first = await getWeeklyQuest(accessToken);
    const second = await getWeeklyQuest(accessToken);

    expect(first.body.id).toBe(second.body.id);
    expect(first.body).toMatchObject({ status: "AVAILABLE", progress: 0 });
    expect(["XP_TARGET", "NUTRITION_LOG_DAYS"]).toContain(first.body.kind);
  });

  it("XP_TARGET: progres raste sa osvojenim XP i zavrsava se kada dostigne cilj (800)", async () => {
    const { accessToken, userId } = await registerUserWithWeeklyQuestKind("xp", "XP_TARGET");

    const initial = await getWeeklyQuest(accessToken);
    expect(initial.body).toMatchObject({ kind: "XP_TARGET", targetProgress: 800, progress: 0, status: "AVAILABLE" });

    await seedXpEvent(userId, 799);
    const almostThere = await getWeeklyQuest(accessToken);
    expect(almostThere.body).toMatchObject({ progress: 799, status: "AVAILABLE" });

    const stateBefore = await getPlayerState(accessToken);
    expect(stateBefore.body.progression).toMatchObject({ totalXp: 799, coins: 0, currentStreak: 0 });

    await seedXpEvent(userId, 1);
    const completed = await getWeeklyQuest(accessToken);
    // progress se klampuje na targetProgress cak i ako je stvarni XP (800) == cilju.
    expect(completed.body).toMatchObject({ progress: 800, targetProgress: 800, status: "COMPLETED" });

    // Nagrada (300 XP + 80 coins) dodata NA VRH postojeceg 800 XP - streak NETAKNUT (nedeljni quest nije trening).
    const stateAfter = await getPlayerState(accessToken);
    expect(stateAfter.body.progression).toMatchObject({ totalXp: 1100, coins: 80, currentStreak: 0 });

    // Ponovni GET ne dodeljuje nagradu ponovo.
    await getWeeklyQuest(accessToken);
    const stateAfterSecondCheck = await getPlayerState(accessToken);
    expect(stateAfterSecondCheck.body.progression.totalXp).toBe(1100);
  });

  it("NUTRITION_LOG_DAYS: progres raste po RAZLICITIM danima sa unosom i zavrsava se kada dostigne cilj (4)", async () => {
    const { accessToken, userId } = await registerUserWithWeeklyQuestKind("nutri", "NUTRITION_LOG_DAYS");

    const initial = await getWeeklyQuest(accessToken);
    expect(initial.body).toMatchObject({ kind: "NUTRITION_LOG_DAYS", targetProgress: 4, progress: 0, status: "AVAILABLE" });

    // Dva unosa ISTOG dana broje se kao JEDAN dan (distinct po datumu).
    await seedNutritionEntry(userId, 0);
    await seedNutritionEntry(userId, 0);
    await seedNutritionEntry(userId, 1);
    const partial = await getWeeklyQuest(accessToken);
    expect(partial.body).toMatchObject({ progress: 2, status: "AVAILABLE" });

    await seedNutritionEntry(userId, 2);
    await seedNutritionEntry(userId, 3);
    const completed = await getWeeklyQuest(accessToken);
    expect(completed.body).toMatchObject({ progress: 4, status: "COMPLETED" });

    const state = await getPlayerState(accessToken);
    expect(state.body.progression).toMatchObject({ totalXp: 300, coins: 80, currentStreak: 0 });
  });
});
