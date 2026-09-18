import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { selectDailyQuestKind, type DailyQuestKind } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Penalty Quest = "iskupljenje" za Penalty System (vidi penalty.e2e-spec.ts) -
 * postoji SAMO kada je dnevni quest stvarno propusten i kaznjen (nikad
 * generisan proizvoljno na GET, za razliku od Boss/Daily/Weekly/Main/Side
 * questa). Zavrsava se na 2. zavrsenom treningu ISTOG dana (vidi
 * WorkoutsService.completeSession) i vraca TACAN iznos izgubljenih coins-a
 * (`coinsLost`, vec klampovan - ne teorijski iznos kazne). Radi protiv prave
 * lokalne Postgres baze, isti obrazac kao boss/side-quest e2e specovima.
 */
describe("Penalty quest (e2e)", () => {
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
    const username = `pq${runId}${suffix}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  /**
   * Isti "registruj dok hash ne pogodi" princip kao boss/side-quest.e2e-spec.ts -
   * fiksira dnevni quest kind na LOG_NUTRITION da WORKOUT_COMPLETE dnevni quest
   * ne bi povremeno dodao +100 XP/+15 coins i ucinio xpGained/coinsGained
   * asercije nedeterministickim (Penalty Quest se testira izolovano).
   */
  async function registerUserWithLogNutritionKind(suffix: string): Promise<{ accessToken: string; userId: string }> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const user = await registerUser(`${suffix}${attempt}`);
      if (selectDailyQuestKind(user.userId, new Date()) === ("LOG_NUTRITION" satisfies DailyQuestKind)) {
        return user;
      }
    }
    throw new Error("Nije pronadjen korisnik sa dnevnim kind-om LOG_NUTRITION posle 50 pokusaja");
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getPlayerState(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
  }

  async function getPenaltyQuest(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/quests/penalty")).expect(200);
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  /** UTC ponoc `days` dana pre danas - isto normalizovanje kao startOfUtcDay. */
  function utcDaysAgo(days: number): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  }

  async function createPastDueDailyQuest(userId: string, daysAgo: number) {
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
        status: "AVAILABLE",
      },
    });
  }

  it("ne postoji Penalty Quest kada nista nije propusteno (normalno stanje)", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getPenaltyQuest(accessToken);
    expect(response.body.quest).toBeNull();
  });

  it("generise Penalty Quest sa tacnim coinReward kada je dnevni quest propusten i kaznjen", async () => {
    const { accessToken, userId } = await registerUser("generate");
    await prisma.progression.update({ where: { userId }, data: { coins: 100 } });
    await createPastDueDailyQuest(userId, 1);

    const playerState = await getPlayerState(accessToken);
    expect(playerState.body.penalty).toEqual({ applied: true, missedQuestCount: 1, coinsLost: 20 });

    const first = await getPenaltyQuest(accessToken);
    const second = await getPenaltyQuest(accessToken);
    expect(first.body.quest.id).toBe(second.body.quest.id);
    expect(first.body.quest).toMatchObject({
      kind: "REDEMPTION_WORKOUT",
      targetProgress: 2,
      progress: 0,
      status: "AVAILABLE",
      xpReward: 50,
      coinReward: 20,
    });
  });

  it("refund je klampovan na stvarno izgubljene coins (ne teorijsku kaznu) kada je stanje manje od kazne", async () => {
    const { accessToken, userId } = await registerUser("clamp");
    await prisma.progression.update({ where: { userId }, data: { coins: 5 } });
    await createPastDueDailyQuest(userId, 1);

    const playerState = await getPlayerState(accessToken);
    expect(playerState.body.penalty).toEqual({ applied: true, missedQuestCount: 1, coinsLost: 5 });

    const penaltyQuest = await getPenaltyQuest(accessToken);
    expect(penaltyQuest.body.quest.coinReward).toBe(5);
  });

  it("zavrsava se na 2. zavrsenom treningu istog dana i vraca izgubljene coins", async () => {
    const { accessToken, userId } = await registerUserWithLogNutritionKind("redeem");
    await prisma.progression.update({ where: { userId }, data: { coins: 100 } });
    await createPastDueDailyQuest(userId, 1);
    await getPlayerState(accessToken);

    const [exercise] = await prisma.exercise.findMany({ take: 1 });
    if (!exercise) throw new Error("Nema seed vezbi u bazi");

    // Prvi trening danas - Penalty Quest jos nije zavrsen (cilj je 2 treninga).
    // (Side Quest bonus za prvu ikad zavrsenu vezbu ovog korisnika NIJE ovde asertovan.)
    const first = await completeWorkout(accessToken, exercise.id);
    expect(first.body.penaltyQuestCompleted).toBe(false);

    // Drugi trening istog dana (ISTA vezba - Side Quest se ne zavrsava ponovo) -
    // Penalty Quest se zavrsava: workout XP (150) + Penalty Quest XP (50) = 200,
    // workout coins (25) + refund izgubljenih coins-a (20) = 45.
    const second = await completeWorkout(accessToken, exercise.id);
    expect(second.body).toMatchObject({ penaltyQuestCompleted: true, xpGained: 200, coinsGained: 45 });

    const penaltyQuestAfter = await getPenaltyQuest(accessToken);
    expect(penaltyQuestAfter.body.quest).toMatchObject({ status: "COMPLETED", progress: 2, targetProgress: 2 });
  });
});
