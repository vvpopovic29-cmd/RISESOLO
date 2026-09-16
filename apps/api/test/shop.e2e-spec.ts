import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { SHOP_ITEMS } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Coin Shop - kupovina/opremanje kozmetike. Katalog (SHOP_ITEMS) zivi u
 * @risesolo/domain, prikazni tekst u apps/api/src/shop/shop-catalog.ts.
 * Radi protiv prave lokalne Postgres baze, isti obrazac kao ostali e2e testovi.
 */
describe("Shop (e2e)", () => {
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
    const username = `shop${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  async function setCoins(userId: string, coins: number): Promise<void> {
    await prisma.progression.update({ where: { userId }, data: { coins } });
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/shop").expect(401);
    await request(app.getHttpServer()).post("/shop/purchase").send({ itemId: "FRAME_BRONZE" }).expect(401);
  });

  it("vraca ceo katalog zakljucan/nekupljen za sveze registrovanog korisnika", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);

    expect(response.body).toHaveLength(SHOP_ITEMS.length);
    expect((response.body as { owned: boolean; equipped: boolean }[]).every((item) => !item.owned && !item.equipped)).toBe(
      true,
    );
  });

  it("odbacuje kupovinu bez dovoljno coins-a (402)", async () => {
    const { accessToken } = await registerUser("poor");

    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase"))
      .send({ itemId: "FRAME_BRONZE" })
      .expect(402);
  });

  it("odbacuje kupovinu nepostojeceg predmeta (404)", async () => {
    const { accessToken, userId } = await registerUser("badid");
    await setCoins(userId, 10_000);

    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase"))
      .send({ itemId: "DOES_NOT_EXIST" })
      .expect(404);
  });

  it("kupuje predmet, oduzima coins i katalog ga potom prikazuje kao vlasnistvo", async () => {
    const { accessToken, userId } = await registerUser("buyer");
    await setCoins(userId, 1000);

    const purchaseResponse = await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase"))
      .send({ itemId: "FRAME_BRONZE" })
      .expect(201);

    expect(purchaseResponse.body).toMatchObject({ item: { id: "FRAME_BRONZE", owned: true }, coins: 900 });

    const shopList = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);
    expect(shopList.body.find((item: { id: string }) => item.id === "FRAME_BRONZE")).toMatchObject({ owned: true });
  });

  it("odbacuje duplu kupovinu istog predmeta (403)", async () => {
    const { accessToken, userId } = await registerUser("double-buy");
    await setCoins(userId, 1000);

    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "FRAME_BRONZE" }).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "FRAME_BRONZE" }).expect(403);
  });

  it("odbacuje opremanje predmeta koji korisnik ne poseduje (403)", async () => {
    const { accessToken } = await registerUser("no-owner");

    await auth(accessToken, request(app.getHttpServer()).post("/shop/equip")).send({ itemId: "FRAME_BRONZE" }).expect(403);
  });

  it("oprema kupljen predmet, a opremanje drugog iz iste kategorije zamenjuje prethodni", async () => {
    const { accessToken, userId } = await registerUser("equip-swap");
    await setCoins(userId, 5000);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "FRAME_BRONZE" }).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "FRAME_SILVER" }).expect(201);

    await auth(accessToken, request(app.getHttpServer()).post("/shop/equip")).send({ itemId: "FRAME_BRONZE" }).expect(201);
    let list = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);
    expect(list.body.find((item: { id: string }) => item.id === "FRAME_BRONZE")).toMatchObject({ equipped: true });

    await auth(accessToken, request(app.getHttpServer()).post("/shop/equip")).send({ itemId: "FRAME_SILVER" }).expect(201);
    list = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);
    expect(list.body.find((item: { id: string }) => item.id === "FRAME_BRONZE")).toMatchObject({ equipped: false });
    expect(list.body.find((item: { id: string }) => item.id === "FRAME_SILVER")).toMatchObject({ equipped: true });
  });

  it("skida opremljen predmet preko DELETE /shop/equip/:category", async () => {
    const { accessToken, userId } = await registerUser("unequip");
    await setCoins(userId, 1000);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "TITLE_NOVICE" }).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/equip")).send({ itemId: "TITLE_NOVICE" }).expect(201);

    await auth(accessToken, request(app.getHttpServer()).delete("/shop/equip/TITLE")).expect(200);

    const list = await auth(accessToken, request(app.getHttpServer()).get("/shop")).expect(200);
    expect(list.body.find((item: { id: string }) => item.id === "TITLE_NOVICE")).toMatchObject({ equipped: false });
  });

  it("odbacuje nepoznatu kategoriju na unequip (400)", async () => {
    const { accessToken } = await registerUser("bad-category");

    await auth(accessToken, request(app.getHttpServer()).delete("/shop/equip/NOT_A_CATEGORY")).expect(400);
  });

  it("GET /players/me prikazuje opremljenu titulu i boju okvira", async () => {
    const { accessToken, userId } = await registerUser("profile-display");
    await setCoins(userId, 5000);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "TITLE_LEGEND" }).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/purchase")).send({ itemId: "FRAME_GOLD" }).expect(201);

    let playerState = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(playerState.body.profile).toMatchObject({ title: null, avatarFrameColorHex: null });

    await auth(accessToken, request(app.getHttpServer()).post("/shop/equip")).send({ itemId: "TITLE_LEGEND" }).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post("/shop/equip")).send({ itemId: "FRAME_GOLD" }).expect(201);

    playerState = await auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
    expect(playerState.body.profile).toMatchObject({ title: "Legenda", avatarFrameColorHex: "#FFD700" });
  });
});
