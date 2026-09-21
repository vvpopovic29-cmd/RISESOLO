import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Lokalizacija (EN + SR) - Profile.locale kontrolise koji jezik backend
 * katalozi (quest/item/shop nazivi) vracaju. Vidi apps/api/src/common/locale.ts
 * (resolveLocale) i README "Lokalizacija" sekciju. AI-generisan tekst
 * (AI quest/item flavor) je NAMERNO van obima ove faze - ostaje srpski.
 */
describe("Locale (e2e)", () => {
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
    const username = `loc${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  it("svezi profil je podrazumevano sr, a shop katalog vraca srpski tekst", async () => {
    const { accessToken } = await registerUser("default");

    const playerState = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(playerState.body.profile.locale).toBe("sr");

    const shop = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);
    expect(shop.body.find((item: { id: string }) => item.id === "FRAME_BRONZE")).toMatchObject({ name: "Bronzani okvir" });
  });

  it("POST /players/me/locale menja jezik i odmah utice na naredne pozive kataloga", async () => {
    const { accessToken } = await registerUser("switch");

    const updated = await auth(accessToken, request(app.getHttpServer()).post("/players/me/locale"))
      .send({ locale: "en" })
      .expect(201);
    expect(updated.body.profile.locale).toBe("en");

    const shop = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);
    expect(shop.body.find((item: { id: string }) => item.id === "FRAME_BRONZE")).toMatchObject({ name: "Bronze Frame" });

    const workshop = await auth(accessToken, request(app.getHttpServer()).get("/inventory/workshop")).expect(200);
    expect(workshop.body.find((item: { id: string }) => item.id === "IRON_TALISMAN")).toMatchObject({ name: "Iron Talisman" });

    const daily = await auth(accessToken, request(app.getHttpServer()).get("/quests/today")).expect(200);
    expect(["Finish today's workout", "Log a meal"]).toContain(daily.body.title);
  });

  it("odbacuje nepoznat jezik (400)", async () => {
    const { accessToken } = await registerUser("bad-locale");

    await auth(accessToken, request(app.getHttpServer()).post("/players/me/locale")).send({ locale: "fr" }).expect(400);
  });

  it("onboarding moze da postavi jezik direktno (device locale)", async () => {
    const { accessToken } = await registerUser("onboard-locale");

    const onboarded = await auth(accessToken, request(app.getHttpServer()).post("/players/me/onboarding"))
      .send({ username: `onb${runId}`.slice(0, 20), locale: "en" })
      .expect(201);
    expect(onboarded.body.profile.locale).toBe("en");
  });
});
