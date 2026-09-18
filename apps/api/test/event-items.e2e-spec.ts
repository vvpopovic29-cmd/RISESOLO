import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Inventory (B2) - Event Items, cetvrti izvor posle Hidden/Workshop/Guild.
 * Za razliku od Workshop Item-a (nivo+coins gate), Event Item se prisvaja
 * BESPLATNO ali SAMO unutar godisnjeg kalendarskog prozora (mesec+dan, vidi
 * @risesolo/domain event-item.ts). Testovi se namerno oslanjaju na STVARAN
 * tekuci datum (isti princip kao ostala mesta u kodu koja koriste `new
 * Date()` bez injektovanog "clock"-a, npr. ISO nedelja za Boss Quest) -
 * AUTUMN_HARVEST (1-30. septembar) je aktivan tokom cele godine razvoja ovog
 * MVP-a (2026), WINTER_WARRIOR (decembar) i SUMMER_SHRED (jun) NIKAD nisu
 * aktivni istog trenutka kad je AUTUMN_HARVEST aktivan.
 */
describe("Inventory - Event Items (e2e)", () => {
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
    const username = `evt${runId}${suffix}${userSeq}`.slice(0, 24);
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

  async function getEventItems(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory/event")).expect(200);
  }

  function findItem(body: unknown[], id: string): { id: string; owned: boolean; active: boolean } {
    const item = (body as Array<{ id: string }>).find((entry) => entry.id === id);
    if (!item) throw new Error(`Item ${id} nije u odgovoru`);
    return item as { id: string; owned: boolean; active: boolean };
  }

  it("vraca ceo katalog (unapred vidljiv) sa owned:false za svezeg korisnika, sa tacnim active flagom za tekuci datum", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getEventItems(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.owned).toBe(false);
      expect(typeof item.name).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(typeof item.active).toBe("boolean");
    }
    expect(findItem(response.body, "AUTUMN_HARVEST").active).toBe(true);
    expect(findItem(response.body, "WINTER_WARRIOR").active).toBe(false);
  });

  it("prisvaja predmet ciji je prozor trenutno aktivan (201) i postaje owned", async () => {
    const { accessToken } = await registerUser("claim");

    const claim = await auth(accessToken, request(app.getHttpServer()).post("/inventory/event/claim"))
      .send({ itemId: "AUTUMN_HARVEST" })
      .expect(201);
    expect(claim.body.item).toMatchObject({ id: "AUTUMN_HARVEST", owned: true, active: true });

    const after = await getEventItems(accessToken);
    expect(findItem(after.body, "AUTUMN_HARVEST").owned).toBe(true);
  });

  it("odbija prisvajanje predmeta ciji prozor trenutno NIJE aktivan (403)", async () => {
    const { accessToken } = await registerUser("inactive");

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/event/claim"))
      .send({ itemId: "WINTER_WARRIOR" })
      .expect(403);
  });

  it("odbija prisvajanje nepoznatog predmeta (404)", async () => {
    const { accessToken } = await registerUser("unknown");

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/event/claim"))
      .send({ itemId: "NEPOSTOJECI_PREDMET" })
      .expect(404);
  });

  it("odbija duplo prisvajanje istog predmeta (403 'Vec imas ovaj predmet') i ne pravi duplikat reda", async () => {
    const { accessToken, userId } = await registerUser("duplicate");

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/event/claim"))
      .send({ itemId: "AUTUMN_HARVEST" })
      .expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/inventory/event/claim"))
      .send({ itemId: "AUTUMN_HARVEST" })
      .expect(403);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, itemId: "AUTUMN_HARVEST" } });
    expect(rows).toHaveLength(1);
  });
});
