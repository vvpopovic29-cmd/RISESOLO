import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PRO_ENTITLEMENT_ID } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { AiService } from "../src/ai/ai.service";

/**
 * AI-Generated Items (B2) - peti izvor. Katalog ID-jeva/nivoa je fiksan i
 * tajan kao Hidden Item (GET /inventory/ai koristi ISTI inventoryItemSchema,
 * "???" dok se ne otkrije), ali name/description generise Claude po igracu
 * (vidi apps/api/src/ai/ai.service.ts generateItemFlavor) - isti obrazac
 * kao ai-quest.e2e-spec.ts: OVERRIDE-ujemo AiService (nema pravog Anthropic
 * kljuca ni lokalno ni u CI-ju) da testiramo i gracefully degradation i
 * "srecan put" (generisanje + perzistiranje generatedName/
 * generatedDescription). Radi protiv prave lokalne Postgres baze.
 */
describe("AI-Generated Items (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;

  const fakeAiService = {
    isConfigured: true,
    model: "test-model",
    generateItemFlavor: jest.fn(async () => ({
      name: "Testni AI Trofej",
      description: "AI personalizovan opis za test.",
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
    fakeAiService.generateItemFlavor.mockClear();
  });

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `aii${runId}${suffix}${userSeq}`.slice(0, 24);
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

  async function setTotalXp(userId: string, totalXp: number): Promise<void> {
    await prisma.progression.update({ where: { userId }, data: { totalXp } });
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getAiItems(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory/ai")).expect(200);
  }

  function findItem(body: unknown[], id: string): { id: string; discovered: boolean; name: string | null; description: string | null } {
    const item = (body as Array<{ id: string }>).find((entry) => entry.id === id);
    if (!item) throw new Error(`Item ${id} nije u odgovoru`);
    return item as { id: string; discovered: boolean; name: string | null; description: string | null };
  }

  it("besplatan korisnik nikad ne otkljucava AI predmete, cak i na visokom nivou (graceful degradation)", async () => {
    const { accessToken, userId } = await registerUser("free");
    await setTotalXp(userId, 300_000);

    const response = await getAiItems(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
      expect(item.name).toBeNull();
      expect(item.description).toBeNull();
    }
    expect(fakeAiService.generateItemFlavor).not.toHaveBeenCalled();
  });

  it("Pro korisnik ne otkljucava AI predmete kada AI servis nije konfigurisan (graceful degradation)", async () => {
    const { accessToken, userId } = await registerUser("nokey");
    await grantProAccess(userId);
    await setTotalXp(userId, 300_000);
    fakeAiService.isConfigured = false;

    const response = await getAiItems(accessToken);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
    }
    expect(fakeAiService.generateItemFlavor).not.toHaveBeenCalled();
  });

  it("Pro korisnik sa svezim nalogom (nivo 1) ne otkljucava nista", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getAiItems(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
    }
    expect(fakeAiService.generateItemFlavor).not.toHaveBeenCalled();
  });

  it("Pro korisnik otkljucava FIRST_SPARK tek na nivou 3, sa AI-generisanim name/description", async () => {
    const { accessToken, userId } = await registerUser("level3");
    await grantProAccess(userId);
    await setTotalXp(userId, 500);

    const response = await getAiItems(accessToken);
    const firstSpark = findItem(response.body, "FIRST_SPARK");
    expect(firstSpark.discovered).toBe(true);
    expect(firstSpark.name).toBe("Testni AI Trofej");
    expect(firstSpark.description).toBe("AI personalizovan opis za test.");

    const risingPulse = findItem(response.body, "RISING_PULSE");
    expect(risingPulse.discovered).toBe(false);

    expect(fakeAiService.generateItemFlavor).toHaveBeenCalledTimes(1);
    expect(fakeAiService.generateItemFlavor.mock.calls[0][0]).toMatchObject({ levelRequirement: 3 });
  });

  it("otkljucava vise predmeta odjednom kada nivo preskoci vise pragova, jedan AI poziv po predmetu", async () => {
    const { accessToken, userId } = await registerUser("multi");
    await grantProAccess(userId);
    await setTotalXp(userId, 30_000);

    const response = await getAiItems(accessToken);
    expect(findItem(response.body, "FIRST_SPARK").discovered).toBe(true);
    expect(findItem(response.body, "RISING_PULSE").discovered).toBe(true);
    expect(findItem(response.body, "STEADY_ASCENT").discovered).toBe(true);
    expect(findItem(response.body, "PEAK_FOCUS").discovered).toBe(false);
    expect(findItem(response.body, "LEGEND_IN_PROGRESS").discovered).toBe(false);

    expect(fakeAiService.generateItemFlavor).toHaveBeenCalledTimes(3);
  });

  it("drugi GET ne poziva AI ponovo za vec otkrivene predmete (perzistiran generatedName/generatedDescription)", async () => {
    const { accessToken, userId } = await registerUser("idempotent");
    await grantProAccess(userId);
    await setTotalXp(userId, 500);

    const first = await getAiItems(accessToken);
    const second = await getAiItems(accessToken);

    expect(findItem(first.body, "FIRST_SPARK").discovered).toBe(true);
    expect(findItem(second.body, "FIRST_SPARK")).toMatchObject(findItem(first.body, "FIRST_SPARK"));
    expect(fakeAiService.generateItemFlavor).toHaveBeenCalledTimes(1);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, source: "AI_GENERATED" } });
    expect(rows).toHaveLength(1);
  });

  it("neuspeh AI poziva za jedan predmet ne blokira ostale (graceful degradation, red se ne pravi za neuspeli)", async () => {
    const { accessToken, userId } = await registerUser("aierror");
    await grantProAccess(userId);
    await setTotalXp(userId, 5_500);
    fakeAiService.generateItemFlavor.mockImplementationOnce(async () => {
      throw new Error("simulirani neuspeh Claude API poziva");
    });

    const response = await getAiItems(accessToken);
    expect(findItem(response.body, "FIRST_SPARK").discovered).toBe(false);
    expect(findItem(response.body, "RISING_PULSE").discovered).toBe(true);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, source: "AI_GENERATED" } });
    expect(rows).toHaveLength(1);
  });
});
