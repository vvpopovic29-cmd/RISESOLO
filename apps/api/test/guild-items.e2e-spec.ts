import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Inventory (B2) - Guild Items, treci izvor posle Hidden i Workshop. Za
 * razliku od Hidden Item-a, katalog je UNAPRED vidljiv (name/description se
 * uvek salju) - ali se, za razliku od Workshop Item-a, AUTOMATSKI dodeljuje
 * na osnovu cehovske aktivnosti (GET-only, isti evaluate-and-discover
 * princip kao Hidden). Testovi seed-uju Guild/GuildMembership/GuildRaid
 * direktno u bazi (isti princip kao ostali Inventory e2e testovi).
 */
describe("Inventory - Guild Items (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const createdGuildIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;
  let guildSeq = 0;

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
    if (createdGuildIds.length > 0) {
      await prisma.guild.deleteMany({ where: { id: { in: createdGuildIds } } });
    }
    await prisma.$disconnect();
    await app.close();
  });

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `gi${runId}${suffix}${userSeq}`.slice(0, 24);
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "correct-horse-battery-staple", username })
      .expect(201);

    createdUserIds.push(response.body.user.id);
    return { accessToken: response.body.accessToken, userId: response.body.user.id };
  }

  async function createGuildWithMember(
    userId: string,
    options: { role?: "LEADER" | "OFFICER" | "MEMBER"; joinedAt?: Date; treasuryCoins?: number; totalXp?: number } = {},
  ): Promise<string> {
    guildSeq += 1;
    const guild = await prisma.guild.create({
      data: {
        name: `Guild ${runId}${guildSeq}`,
        tag: `G${runId}${guildSeq}`.toUpperCase(),
        treasuryCoins: options.treasuryCoins ?? 0,
        totalXp: options.totalXp ?? 0,
      },
    });
    createdGuildIds.push(guild.id);
    await prisma.guildMembership.create({
      data: { guildId: guild.id, userId, role: options.role ?? "MEMBER", joinedAt: options.joinedAt ?? new Date() },
    });
    return guild.id;
  }

  function auth(token: string, req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${token}`);
  }

  async function getGuildItems(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/inventory/guild")).expect(200);
  }

  function findItem(body: unknown[], id: string): { id: string; discovered: boolean; name: string | null } {
    const item = (body as Array<{ id: string }>).find((entry) => entry.id === id);
    if (!item) throw new Error(`Item ${id} nije u odgovoru`);
    return item as { id: string; discovered: boolean; name: string | null };
  }

  it("vraca svih 5 Guild Item-a kao neotkrivene za korisnika koji nije clan ceha, ALI sa vidljivim name/description", async () => {
    const { accessToken } = await registerUser("noguild");

    const response = await getGuildItems(accessToken);
    expect(response.body).toHaveLength(5);
    for (const item of response.body) {
      expect(item.discovered).toBe(false);
      expect(item.discoveredAt).toBeNull();
      expect(typeof item.name).toBe("string");
      expect(typeof item.description).toBe("string");
      expect(item.source).toBe("GUILD");
    }
  });

  it("otkriva GUILD_FOUNDER samo kada je korisnik LEADER svog trenutnog ceha", async () => {
    const { accessToken, userId } = await registerUser("leader");
    await createGuildWithMember(userId, { role: "LEADER" });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "GUILD_FOUNDER").discovered).toBe(true);
    expect(findItem(response.body, "GUILD_FOUNDER").name).toBe("Osnivac Ceha");
  });

  it("ne otkriva GUILD_FOUNDER za obicnog clana (MEMBER)", async () => {
    const { accessToken, userId } = await registerUser("member");
    await createGuildWithMember(userId, { role: "MEMBER" });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "GUILD_FOUNDER").discovered).toBe(false);
  });

  it("otkriva RAID_BREAKER kada ceh ima 5+ zavrsenih rejdova", async () => {
    const { accessToken, userId } = await registerUser("raids");
    const guildId = await createGuildWithMember(userId);
    const now = new Date();
    await prisma.guildRaid.createMany({
      data: Array.from({ length: 5 }, (_, i) => {
        const weekStart = new Date(now);
        weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
        return {
          guildId,
          weekStart,
          targetContributions: 10,
          coinReward: 100,
          status: "COMPLETED" as const,
          completedAt: now,
        };
      }),
    });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "RAID_BREAKER").discovered).toBe(true);
  });

  it("ne otkriva RAID_BREAKER sa manje od 5 zavrsenih rejdova", async () => {
    const { accessToken, userId } = await registerUser("fewraids");
    const guildId = await createGuildWithMember(userId);
    await prisma.guildRaid.createMany({
      data: Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date();
        weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
        return { guildId, weekStart, targetContributions: 10, coinReward: 100, status: "COMPLETED" as const };
      }),
    });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "RAID_BREAKER").discovered).toBe(false);
  });

  it("otkriva TREASURY_KEEPER kada cehovska riznica dostigne 1000+ coins-a", async () => {
    const { accessToken, userId } = await registerUser("treasury");
    await createGuildWithMember(userId, { treasuryCoins: 1000 });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "TREASURY_KEEPER").discovered).toBe(true);
  });

  it("otkriva GUILD_VETERAN posle 14+ dana clanstva", async () => {
    const { accessToken, userId } = await registerUser("veteran");
    const joinedAt = new Date();
    joinedAt.setUTCDate(joinedAt.getUTCDate() - 20);
    await createGuildWithMember(userId, { joinedAt });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "GUILD_VETERAN").discovered).toBe(true);
  });

  it("ne otkriva GUILD_VETERAN za svezeg clana ceha", async () => {
    const { accessToken, userId } = await registerUser("newmember");
    await createGuildWithMember(userId, { joinedAt: new Date() });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "GUILD_VETERAN").discovered).toBe(false);
  });

  it("otkriva GUILD_POWERHOUSE kada ceh dostigne nivo 10", async () => {
    const { accessToken, userId } = await registerUser("powerhouse");
    await createGuildWithMember(userId, { totalXp: 30000 });

    const response = await getGuildItems(accessToken);
    expect(findItem(response.body, "GUILD_POWERHOUSE").discovered).toBe(true);
  });

  it("otkriveni predmet ostaje otkriven i posle napustanja ceha (persistuje se cinjenica otkrivanja)", async () => {
    const { accessToken, userId } = await registerUser("leaves");
    await createGuildWithMember(userId, { treasuryCoins: 1000 });
    const first = await getGuildItems(accessToken);
    expect(findItem(first.body, "TREASURY_KEEPER").discovered).toBe(true);

    await prisma.guildMembership.delete({ where: { userId } });
    const second = await getGuildItems(accessToken);
    expect(findItem(second.body, "TREASURY_KEEPER").discovered).toBe(true);
  });

  it("otkrivanje je idempotentno - drugi GET ne pravi duplikat reda u bazi", async () => {
    const { accessToken, userId } = await registerUser("idempotent");
    await createGuildWithMember(userId, { role: "LEADER" });
    await getGuildItems(accessToken);
    await getGuildItems(accessToken);

    const rows = await prisma.inventoryItem.findMany({ where: { userId, itemId: "GUILD_FOUNDER" } });
    expect(rows).toHaveLength(1);
  });
});
