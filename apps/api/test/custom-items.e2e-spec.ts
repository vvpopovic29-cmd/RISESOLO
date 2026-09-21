import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CUSTOM_ITEM_COIN_COST, CUSTOM_ITEM_MAX_COUNT } from "@risesolo/domain";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Inventory (B2) - Custom Items, sedmi i poslednji izvor. Za razliku od svih
 * ostalih 6 izvora (svaki ima tacno 5 fiksnih ID-jeva u @risesolo/domain
 * katalogu), Custom Item NEMA fiksan katalog - igrac SAM pise name/
 * description preko POST /inventory/custom/create, server generise itemId.
 * Gate je cena u coins-ima (bez nivo uslova) I ogranicen broj slotova
 * (CUSTOM_ITEM_MAX_COUNT) po igracu, ne katalog uslov. Radi protiv prave
 * lokalne Postgres baze, isti obrazac kao ostali e2e testovi.
 */
describe("Inventory - Custom Items (e2e)", () => {
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
    const username = `cst${runId}${suffix}${userSeq}`.slice(0, 24);
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

  async function getCustomItems(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory/custom")).expect(200);
  }

  it("vraca prazan niz za svezeg korisnika (nema fiksan katalog, samo ono sto je igrac napravio)", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getCustomItems(accessToken);
    expect(response.body).toEqual([]);
  });

  it("odbija kreiranje bez dovoljno coins-a (402)", async () => {
    const { accessToken, userId } = await registerUser("poor");
    await prisma.progression.update({ where: { userId }, data: { coins: CUSTOM_ITEM_COIN_COST - 1 } });

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
      .send({ name: "Moj Amulet", description: "Amulet koji sam sam napravio" })
      .expect(402);
  });

  it("odbija kreiranje bez naziva ili sa predugim opisom (400)", async () => {
    const { accessToken, userId } = await registerUser("invalid");
    await prisma.progression.update({ where: { userId }, data: { coins: CUSTOM_ITEM_COIN_COST * 10 } });

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
      .send({ name: "", description: "d" })
      .expect(400);
    await auth(accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
      .send({ name: "Moj Amulet", description: "d".repeat(301) })
      .expect(400);
  });

  it("kreira predmet kada su coins dovoljni, oduzima TACNU cenu, i vraca ga na listi kao discovered:true", async () => {
    const { accessToken, userId } = await registerUser("create");
    await prisma.progression.update({ where: { userId }, data: { coins: 1000 } });

    const create = await auth(accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
      .send({ name: "Moj Amulet", description: "Amulet koji sam sam napravio" })
      .expect(201);

    expect(create.body.item).toMatchObject({
      source: "CUSTOM",
      discovered: true,
      name: "Moj Amulet",
      description: "Amulet koji sam sam napravio",
    });
    expect(typeof create.body.item.id).toBe("string");
    expect(create.body.coins).toBe(1000 - CUSTOM_ITEM_COIN_COST);

    const after = await getCustomItems(accessToken);
    expect(after.body).toHaveLength(1);
    expect(after.body[0]).toMatchObject({ id: create.body.item.id, name: "Moj Amulet" });
  });

  it(`odbija kreiranje preko granice od ${CUSTOM_ITEM_MAX_COUNT} slotova (403), cak i sa dovoljno coins-a`, async () => {
    const { accessToken, userId } = await registerUser("cap");
    await prisma.progression.update({ where: { userId }, data: { coins: CUSTOM_ITEM_COIN_COST * (CUSTOM_ITEM_MAX_COUNT + 5) } });

    for (let i = 0; i < CUSTOM_ITEM_MAX_COUNT; i += 1) {
      await auth(accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
        .send({ name: `Predmet ${i}`, description: `Opis ${i}` })
        .expect(201);
    }

    await auth(accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
      .send({ name: "Visak", description: "Ovaj ne bi trebalo da prodje" })
      .expect(403);

    const after = await getCustomItems(accessToken);
    expect(after.body).toHaveLength(CUSTOM_ITEM_MAX_COUNT);
  });

  it("ne vraca predmete drugog korisnika", async () => {
    const userA = await registerUser("owner");
    const userB = await registerUser("stranger");
    await prisma.progression.update({ where: { userId: userA.userId }, data: { coins: 1000 } });

    await auth(userA.accessToken, request(app.getHttpServer()).post("/inventory/custom/create"))
      .send({ name: "Tudje Vlasnistvo", description: "Ovo pripada korisniku A" })
      .expect(201);

    const bResponse = await getCustomItems(userB.accessToken);
    expect(bResponse.body).toEqual([]);
  });
});
