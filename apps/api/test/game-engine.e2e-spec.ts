import type { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AuthModule } from "../src/auth/auth.module";
import { PlayerModule } from "../src/player/player.module";
import { QuestsModule } from "../src/quests/quests.module";

describe("Game engine (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ JWT_SECRET: "test-e2e-secret", JWT_EXPIRES_IN: "1h" })],
        }),
        AuthModule,
        PlayerModule,
        QuestsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("kompletan tok: registracija -> quest -> zavrsetak -> level up -> raspodela poena", async () => {
    const registerResponse = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "hunter@risesolo.app", password: "password123", displayName: "Hunter" })
      .expect(201);

    const token = registerResponse.body.accessToken as string;
    expect(typeof token).toBe("string");

    await request(app.getHttpServer()).get("/player/me").expect(401);

    const profileBefore = await request(app.getHttpServer())
      .get("/player/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(profileBefore.body).toMatchObject({ level: 1, rank: "E", unallocatedStatPoints: 0 });

    const questResponse = await request(app.getHttpServer())
      .post("/quests")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "100 sklekova", xpReward: 100, goldReward: 25 })
      .expect(201);

    const questId = questResponse.body.id as string;

    const completeResponse = await request(app.getHttpServer())
      .patch(`/quests/${questId}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(completeResponse.body.leveledUp).toBe(true);
    expect(completeResponse.body.previousRank).toBe("E");
    expect(completeResponse.body.player.level).toBe(2);
    expect(completeResponse.body.player.gold).toBe(25);
    expect(completeResponse.body.player.unallocatedStatPoints).toBe(3);

    await request(app.getHttpServer())
      .patch(`/quests/${questId}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .expect(409);

    const allocateResponse = await request(app.getHttpServer())
      .patch("/player/me/stats")
      .set("Authorization", `Bearer ${token}`)
      .send({ stat: "strength", points: 3 })
      .expect(200);

    expect(allocateResponse.body.stats.strength).toBe(3);
    expect(allocateResponse.body.unallocatedStatPoints).toBe(0);
  });

  it("registracija sa vec zauzetim emailom vraca 409", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "dup@risesolo.app", password: "password123", displayName: "Hunter" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "dup@risesolo.app", password: "password123", displayName: "Hunter2" })
      .expect(409);
  });

  it("nevalidan register body vraca 400", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "not-an-email", password: "short", displayName: "H" })
      .expect(400);
  });

  it("login sa pogresnom lozinkom vraca 401", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: "login-test@risesolo.app", password: "password123", displayName: "Hunter" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: "login-test@risesolo.app", password: "wrong-password" })
      .expect(401);
  });
});
