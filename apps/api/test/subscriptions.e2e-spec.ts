import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { FREE_TRAINING_PLAN_LIMIT, PRO_ENTITLEMENT_ID } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Subscriptions/RevenueCat - webhook je jedini nacin da entitlement postane
 * aktivan (vidi apps/api/src/subscriptions/subscriptions.service.ts). Radi
 * protiv prave lokalne Postgres baze, isti obrazac kao ostali e2e testovi.
 * Webhook testovi zahtevaju `REVENUECAT_WEBHOOK_AUTH_HEADER` u environment-u
 * (podeseno u apps/api/.env lokalno i .github/workflows/ci.yml u CI-ju) -
 * bez toga je webhook fail-closed (401) sto je pokriveno posebnim testom.
 */
describe("Subscriptions (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  const webhookAuthHeader = process.env.REVENUECAT_WEBHOOK_AUTH_HEADER;

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
    const username = `sub${runId}${suffix}`;
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  function sendWebhook(body: unknown, authHeader?: string) {
    const req = request(app.getHttpServer()).post("/subscriptions/webhook").send(body);
    return authHeader !== undefined ? req.set("Authorization", authHeader) : req;
  }

  function purchaseEvent(userId: string, overrides: Record<string, unknown> = {}) {
    return {
      event: {
        type: "INITIAL_PURCHASE",
        app_user_id: userId,
        entitlement_ids: [PRO_ENTITLEMENT_ID],
        product_id: "monthly_pro",
        store: "APP_STORE",
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        ...overrides,
      },
    };
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/subscriptions/me").expect(401);
  });

  it("vraca isPro=false za korisnika bez pretplate", async () => {
    const { accessToken } = await registerUser("free");

    const response = await request(app.getHttpServer())
      .get("/subscriptions/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ isPro: false, productId: null, expiresAt: null, willRenew: false });
  });

  it("webhook odbija zahtev bez ili sa pogresnim Authorization header-om (fail-closed)", async () => {
    const { userId } = await registerUser("badauth");

    await sendWebhook(purchaseEvent(userId)).expect(401);
    await sendWebhook(purchaseEvent(userId), "Bearer definitely-wrong").expect(401);
  });

  (webhookAuthHeader ? describe : describe.skip)("sa konfigurisanim REVENUECAT_WEBHOOK_AUTH_HEADER", () => {
    it("INITIAL_PURCHASE aktivira pro_access i GET /subscriptions/me ga vidi", async () => {
      const { accessToken, userId } = await registerUser("purchase");

      await sendWebhook(purchaseEvent(userId), webhookAuthHeader).expect(200);

      const status = await request(app.getHttpServer())
        .get("/subscriptions/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(status.body).toMatchObject({ isPro: true, productId: "monthly_pro", willRenew: true });
      expect(status.body.expiresAt).not.toBeNull();
    });

    it("CANCELLATION ostavlja entitlement aktivan do isteka, ali willRenew postaje false", async () => {
      const { accessToken, userId } = await registerUser("cancel");
      const expirationMs = Date.now() + 10 * 24 * 60 * 60 * 1000;

      await sendWebhook(purchaseEvent(userId, { expiration_at_ms: expirationMs }), webhookAuthHeader).expect(200);
      await sendWebhook(
        purchaseEvent(userId, { type: "CANCELLATION", expiration_at_ms: expirationMs }),
        webhookAuthHeader,
      ).expect(200);

      const status = await request(app.getHttpServer())
        .get("/subscriptions/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(status.body).toMatchObject({ isPro: true, willRenew: false });
    });

    it("EXPIRATION sa proslim expiration_at_ms gasi pro_access", async () => {
      const { accessToken, userId } = await registerUser("expire");

      await sendWebhook(purchaseEvent(userId), webhookAuthHeader).expect(200);
      await sendWebhook(
        purchaseEvent(userId, { type: "EXPIRATION", expiration_at_ms: Date.now() - 1000 }),
        webhookAuthHeader,
      ).expect(200);

      const status = await request(app.getHttpServer())
        .get("/subscriptions/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(status.body).toMatchObject({ isPro: false, willRenew: false });
    });

    it("ignorise event koji se ne tice pro_access entitlement-a (bez greske, bez efekta)", async () => {
      const { accessToken, userId } = await registerUser("otherent");

      await sendWebhook(purchaseEvent(userId, { entitlement_ids: ["some_other_entitlement"] }), webhookAuthHeader).expect(
        200,
      );

      const status = await request(app.getHttpServer())
        .get("/subscriptions/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(status.body.isPro).toBe(false);
    });

    it("ignorise event za nepoznat app_user_id (bez greske)", async () => {
      await sendWebhook(purchaseEvent("does-not-exist"), webhookAuthHeader).expect(200);
    });

    it("gate-uje generisanje AI trening plana posle FREE_TRAINING_PLAN_LIMIT, pro_access uklanja limit", async () => {
      const { accessToken, userId } = await registerUser("gate");

      for (let i = 0; i < FREE_TRAINING_PLAN_LIMIT; i += 1) {
        await prisma.trainingPlan.create({
          data: {
            userId,
            title: `Postojeci plan ${i}`,
            daysPerWeek: 3,
            content: { days: [{ day: 1, focus: "Full body", exercises: [{ exerciseSlug: "chest-wall-push-up", sets: 3, reps: "8-12" }] }] },
            model: "test-model",
          },
        });
      }

      // Limit dostignut, jos uvek besplatan korisnik -> 402 PRE poziva AI-a
      // (nema ANTHROPIC_API_KEY u testu, pa bi inace bio 503 - 402 dokazuje
      // da je gate provera zaista ispred AI poziva).
      await request(app.getHttpServer())
        .post("/training-plans/generate")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ daysPerWeek: 3 })
        .expect(402);

      await sendWebhook(purchaseEvent(userId), webhookAuthHeader).expect(200);

      // Pro korisnik prolazi gate - sada dolazi do stvarnog AI poziva, koji
      // (ocekivano, bez kljuca) vraca 503, ne 402.
      await request(app.getHttpServer())
        .post("/training-plans/generate")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ daysPerWeek: 3 })
        .expect(503);
    });
  });
});
