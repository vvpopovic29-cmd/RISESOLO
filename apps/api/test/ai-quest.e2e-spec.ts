import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PRO_ENTITLEMENT_ID } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AiService } from "../src/ai/ai.service";

/**
 * AI Quest - Pro-gated bonus quest ciji title/description generise Claude
 * (vidi apps/api/src/ai/ai.service.ts generateQuestFlavor). Za razliku od
 * training-plans.e2e-spec.ts (koji testira "bez ANTHROPIC_API_KEY -> 503"),
 * ovaj quest MORA gracefully vratiti `quest: null` (nikad gresku) kad AI nije
 * dostupan - zato ovde OVERRIDE-ujemo AiService (nema pravog Anthropic
 * kljuca ni lokalno ni u CI-ju - vidi training-plans.e2e-spec.ts) da bismo
 * testirali i "srecan put" (generisanje + zavrsetak), ne samo degradaciju.
 * Radi protiv prave lokalne Postgres baze, isti obrazac kao ostali e2e testovi.
 */
describe("AI quest (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;

  const fakeAiService = {
    isConfigured: true,
    model: "test-model",
    generateQuestFlavor: jest.fn(async () => ({
      title: "Testni AI Quest",
      description: "AI personalizovana poruka za test.",
    })),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(fakeAiService)
      .compile();

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

  afterEach(() => {
    fakeAiService.isConfigured = true;
    fakeAiService.generateQuestFlavor.mockClear();
  });

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `aiq${runId}${suffix}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  async function grantProAccess(userId: string): Promise<void> {
    await prisma.subscription.create({
      data: {
        userId,
        entitlementId: PRO_ENTITLEMENT_ID,
        productId: "monthly_pro",
        store: "APP_STORE",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        willRenew: true,
      },
    });
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getAiQuest(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/quests/ai")).expect(200);
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  it("besplatan korisnik nikad ne dobija AI Quest (quest: null)", async () => {
    const { accessToken } = await registerUser("free");

    const response = await getAiQuest(accessToken);
    expect(response.body.quest).toBeNull();
    expect(fakeAiService.generateQuestFlavor).not.toHaveBeenCalled();
  });

  it("Pro korisnik ne dobija AI Quest kada AI servis nije konfigurisan (graceful degradation)", async () => {
    const { accessToken, userId } = await registerUser("nokey");
    await grantProAccess(userId);
    fakeAiService.isConfigured = false;

    const response = await getAiQuest(accessToken);
    expect(response.body.quest).toBeNull();
    expect(fakeAiService.generateQuestFlavor).not.toHaveBeenCalled();
  });

  it("Pro korisnik ne dobija AI Quest kada AI poziv baci gresku (graceful degradation)", async () => {
    const { accessToken, userId } = await registerUser("aierror");
    await grantProAccess(userId);
    fakeAiService.generateQuestFlavor.mockImplementationOnce(async () => {
      throw new Error("simulirani neuspeh Claude API poziva");
    });

    const response = await getAiQuest(accessToken);
    expect(response.body.quest).toBeNull();
  });

  it("Pro korisnik dobija AI-generisan quest sa personalizovanim sadrzajem, generisano samo jednom po danu", async () => {
    const { accessToken, userId } = await registerUser("pro");
    await grantProAccess(userId);

    const first = await getAiQuest(accessToken);
    const second = await getAiQuest(accessToken);

    expect(first.body.quest).not.toBeNull();
    expect(first.body.quest.id).toBe(second.body.quest.id);
    expect(first.body.quest).toMatchObject({
      kind: "AI_PERSONALIZED",
      title: "Testni AI Quest",
      description: "AI personalizovana poruka za test.",
      targetProgress: 1,
      progress: 0,
      status: "AVAILABLE",
      xpReward: 150,
      coinReward: 30,
    });
    // Drugi GET istog dana NE poziva AI ponovo (vec postoji red u bazi).
    expect(fakeAiService.generateQuestFlavor).toHaveBeenCalledTimes(1);
    expect(fakeAiService.generateQuestFlavor.mock.calls[0][0]).toMatchObject({
      level: 1,
      rank: "E",
      currentStreak: 0,
    });
    void userId;
  });

  it("zavrsava se na bilo kom zavrsenom treningu istog dana (identicno Daily Quest WORKOUT_COMPLETE kind-u)", async () => {
    const { accessToken, userId } = await registerUser("redeem");
    await grantProAccess(userId);
    await getAiQuest(accessToken);

    const [exercise] = await prisma.exercise.findMany({ take: 1 });
    if (!exercise) throw new Error("Nema seed vezbi u bazi");

    const completion = await completeWorkout(accessToken, exercise.id);
    expect(completion.body.aiQuestCompleted).toBe(true);

    const after = await getAiQuest(accessToken);
    expect(after.body.quest).toMatchObject({ status: "COMPLETED", progress: 1, targetProgress: 1 });
    void userId;
  });
});
