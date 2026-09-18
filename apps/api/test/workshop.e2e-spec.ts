import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Inventory (B2) - Workshop Items, drugi izvor posle Hidden Items. Za
 * razliku od Hidden Item-a (tajni uslov, GET-only), Workshop katalog je
 * unapred vidljiv i zahteva AKTIVNU mutirajucu akciju (POST /craft) uz
 * nivo+coins - isti princip zastite od trke kao Coin Shop (vidi
 * shop.e2e-spec.ts), samo sa dodatnim uslovom nivoa. Radi protiv prave
 * lokalne Postgres baze, isti obrazac kao ostali e2e testovi.
 */
describe("Inventory - Workshop Items (e2e)", () => {
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
    const username = `wsh${runId}${suffix}${userSeq}`.slice(0, 24);
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

  async function getWorkshop(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory/workshop")).expect(200);
  }

  function findItem(body: unknown[], id: string): { id: string; owned: boolean } {
    const item = (body as Array<{ id: string }>).find((entry) => entry.id === id);
    if (!item) throw new Error(`Item ${id} nije u odgovoru`);
    return item as { id: string; owned: boolean };
  }

  it("vraca ceo katalog (unapred vidljiv, za razliku od Hidden Item-a) sa owned:false za svezeg korisnika", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getWorkshop(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.owned).toBe(false);
      expect(typeof item.name).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(item.levelRequirement).toBeGreaterThan(0);
      expect(item.coinCost).toBeGreaterThan(0);
    }
    expect(findItem(response.body, "IRON_TALISMAN")).toMatchObject({ levelRequirement: 3, coinCost: 200 });
  });

  it("odbija izradu ispod potrebnog nivoa (403), cak i sa dovoljno coins-a", async () => {
    const { accessToken, userId } = await registerUser("lowlevel");
    await prisma.progression.update({ where: { userId }, data: { totalXp: 0, coins: 10000 } });

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/workshop/craft"))
      .send({ itemId: "IRON_TALISMAN" })
      .expect(403);
  });

  it("odbija izradu bez dovoljno coins-a (402), cak i sa dovoljnim nivoom", async () => {
    const { accessToken, userId } = await registerUser("poor");
    await prisma.progression.update({ where: { userId }, data: { totalXp: 10000, coins: 0 } });

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/workshop/craft"))
      .send({ itemId: "IRON_TALISMAN" })
      .expect(402);
  });

  it("odbija izradu nepoznatog predmeta (404)", async () => {
    const { accessToken, userId } = await registerUser("unknown");
    await prisma.progression.update({ where: { userId }, data: { totalXp: 10000, coins: 10000 } });

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/workshop/craft"))
      .send({ itemId: "NEPOSTOJECI_PREDMET" })
      .expect(404);
  });

  it("izradjuje predmet kada su nivo i coins dovoljni, oduzima TACNU cenu i predmet postaje owned", async () => {
    const { accessToken, userId } = await registerUser("craft");
    await prisma.progression.update({ where: { userId }, data: { totalXp: 10000, coins: 1000 } });

    const craft = await auth(accessToken, request(app.getHttpServer()).post("/inventory/workshop/craft"))
      .send({ itemId: "IRON_TALISMAN" })
      .expect(201);

    expect(craft.body.item).toMatchObject({ id: "IRON_TALISMAN", owned: true, levelRequirement: 3, coinCost: 200 });
    expect(craft.body.coins).toBe(800);

    const after = await getWorkshop(accessToken);
    expect(findItem(after.body, "IRON_TALISMAN").owned).toBe(true);
    void userId;
  });

  it("odbija duplu izradu istog predmeta (403 'Vec imas ovaj predmet') i ne pravi duplikat reda", async () => {
    const { accessToken, userId } = await registerUser("duplicate");
    await prisma.progression.update({ where: { userId }, data: { totalXp: 10000, coins: 1000 } });

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/workshop/craft"))
      .send({ itemId: "IRON_TALISMAN" })
      .expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/inventory/workshop/craft"))
      .send({ itemId: "IRON_TALISMAN" })
      .expect(403);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, itemId: "IRON_TALISMAN" } });
    expect(rows).toHaveLength(1);
  });
});
