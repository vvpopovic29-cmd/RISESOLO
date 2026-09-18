import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import type { MainQuestKind } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Main Quest - dugorocni LANAC, ODVOJEN od Achievements (LEVEL_5/10/20 vec
 * pokriva "dostigni level X" - ovde je fokus na RASTU STATOVA, koji
 * Achievements ne prate). Za razliku od Daily/Weekly/Boss, NIKAD ne istice
 * niti se resetuje po datumu - lanac rotira kroz stat-ove
 * (snaga->agilnost->izdrzljivost->vitalnost->inteligencija->snaga na visem
 * tier-u). Vidi apps/api/src/quests/quests.service.ts. Radi protiv prave
 * lokalne Postgres baze, isti obrazac kao weekly-quest.e2e-spec.ts.
 */
describe("Main quest (e2e)", () => {
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
    const username = `mq${runId}${suffix}${userSeq}`.slice(0, 24);
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

  async function getMainQuest(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/quests/main")).expect(200);
  }

  async function getPlayerState(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/players/me")).expect(200);
  }

  /** Direktan upis u PlayerStats - simulira da je korisnik vec raspodelio poene do date vrednosti. */
  async function seedStat(userId: string, kind: MainQuestKind, value: number): Promise<void> {
    await prisma.playerStats.update({ where: { userId }, data: { [kind]: value } });
  }

  it("generise AVAILABLE main quest (strength, tier 1, cilj 10) za novog korisnika, idempotentno", async () => {
    const { accessToken } = await registerUser("fresh");

    const first = await getMainQuest(accessToken);
    const second = await getMainQuest(accessToken);

    expect(first.body.id).toBe(second.body.id);
    expect(first.body).toMatchObject({
      kind: "strength",
      tier: 1,
      targetProgress: 10,
      progress: 1,
      status: "AVAILABLE",
      xpReward: 400,
      coinReward: 100,
    });
  });

  it("zavrsava se kada stat dostigne cilj i generise SLEDECI u lancu (agility, tier 1)", async () => {
    const { accessToken, userId } = await registerUser("chain");

    const first = await getMainQuest(accessToken);
    expect(first.body).toMatchObject({ kind: "strength", status: "AVAILABLE" });

    await seedStat(userId, "strength", 10);
    const completed = await getMainQuest(accessToken);
    expect(completed.body).toMatchObject({ id: first.body.id, kind: "strength", progress: 10, status: "COMPLETED" });

    // Nagrada (400 XP + 100 coins) dodata, streak NETAKNUT (main quest nije trening).
    const state = await getPlayerState(accessToken);
    expect(state.body.progression).toMatchObject({ totalXp: 400, coins: 100, currentStreak: 0 });

    // Sledeci GET vraca NOVI quest u lancu (agility, i dalje tier 1, jos nema pune rotacije).
    const next = await getMainQuest(accessToken);
    expect(next.body.id).not.toBe(first.body.id);
    expect(next.body).toMatchObject({ kind: "agility", tier: 1, targetProgress: 10, progress: 1, status: "AVAILABLE" });

    // Ponovni GET ne dodeljuje nagradu ponovo za vec zavrsen quest.
    const stateAfterSecondCheck = await getPlayerState(accessToken);
    expect(stateAfterSecondCheck.body.progression.totalXp).toBe(400);
  });

  it("puna rotacija kroz svih 5 stat-ova pre nego sto tier poraste na 2", async () => {
    const { accessToken, userId } = await registerUser("rotation");
    const kinds: MainQuestKind[] = ["strength", "agility", "endurance", "vitality", "intelligence"];

    for (const kind of kinds) {
      const current = await getMainQuest(accessToken);
      expect(current.body).toMatchObject({ kind, tier: 1, targetProgress: 10, status: "AVAILABLE" });
      await seedStat(userId, kind, 10);
      const completed = await getMainQuest(accessToken);
      expect(completed.body).toMatchObject({ kind, status: "COMPLETED" });
    }

    const afterFullRotation = await getMainQuest(accessToken);
    expect(afterFullRotation.body).toMatchObject({ kind: "strength", tier: 2, targetProgress: 20, progress: 10, status: "AVAILABLE" });
  });
});
