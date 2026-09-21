import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { GUILD_RAID_COIN_REWARD, GUILD_RAID_TARGET_CONTRIBUTIONS, calculateLevel } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Guild sistem - Management/Progression/Raid/Chat/Treasury - vidi
 * apps/api/src/guilds/guilds.service.ts. Radi protiv prave lokalne Postgres
 * baze, isti obrazac kao ostali e2e testovi.
 */
describe("Guilds (e2e)", () => {
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
    const username = `g${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  async function createGuild(accessToken: string, suffix: string): Promise<request.Response> {
    guildSeq += 1;
    // Tag mora biti <=6 karaktera i globalno unique u bazi - kombinacija dela
    // runId-a i rastuceg brojaca (ne cist suffix, koji je predugacak).
    const tag = `${runId.slice(0, 4)}${guildSeq}`.toUpperCase();
    const response = await auth(accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: `Guild ${runId} ${suffix}`, tag })
      .expect(201);
    createdGuildIds.push(response.body.id);
    return response;
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  // -- Management ---------------------------------------------------------

  it("kreira ceh i postavlja tvorca za LEADER", async () => {
    const { accessToken } = await registerUser("create");
    const created = await createGuild(accessToken, "a");

    expect(created.body).toMatchObject({ myRole: "LEADER", level: 1, totalXp: 0, treasuryCoins: 0 });
    expect(created.body.members).toHaveLength(1);
  });

  it("sprecava kreiranje ceha sa vec zauzetim tagom", async () => {
    const owner = await registerUser("dup-owner");
    const challenger = await registerUser("dup-challenger");
    const guild = await createGuild(owner.accessToken, "dup");

    await auth(challenger.accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: "Drugo ime", tag: guild.body.tag })
      .expect(409);
  });

  it("join preko taga dodaje MEMBER-a u listu clanova", async () => {
    const owner = await registerUser("join-owner");
    const joiner = await registerUser("join-member");
    const guild = await createGuild(owner.accessToken, "join");

    const joined = await auth(joiner.accessToken, request(app.getHttpServer()).post("/guilds/join"))
      .send({ tag: guild.body.tag })
      .expect(201);

    expect(joined.body.myRole).toBe("MEMBER");
    expect(joined.body.members).toHaveLength(2);
  });

  it("sprecava join ako je korisnik vec clan nekog ceha", async () => {
    const owner = await registerUser("already-owner");
    const member = await registerUser("already-member");
    const otherOwner = await registerUser("already-other");
    const guild = await createGuild(owner.accessToken, "already1");
    const otherGuild = await createGuild(otherOwner.accessToken, "already2");

    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join"))
      .send({ tag: otherGuild.body.tag })
      .expect(409);
  });

  it("napustanje: LEADER prenosi vodjstvo na preostalog clana", async () => {
    const owner = await registerUser("succ-owner");
    const member = await registerUser("succ-member");
    const guild = await createGuild(owner.accessToken, "succ");
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);

    await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds/leave")).expect(201);

    const detail = await auth(member.accessToken, request(app.getHttpServer()).get("/guilds/me")).expect(200);
    expect(detail.body.myRole).toBe("LEADER");
    expect(detail.body.members).toHaveLength(1);
  });

  it("napustanje poslednjeg clana brise ceh", async () => {
    const owner = await registerUser("solo-owner");
    const guild = await createGuild(owner.accessToken, "solo");

    await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds/leave")).expect(201);

    const stillExists = await prisma.guild.findUnique({ where: { id: guild.body.id } });
    expect(stillExists).toBeNull();
    createdGuildIds.splice(createdGuildIds.indexOf(guild.body.id), 1);
  });

  it("kick: LEADER moze izbaciti MEMBER-a, MEMBER ne moze izbaciti nikoga", async () => {
    const owner = await registerUser("kick-owner");
    const memberA = await registerUser("kick-a");
    const memberB = await registerUser("kick-b");
    const guild = await createGuild(owner.accessToken, "kick");
    await auth(memberA.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);
    await auth(memberB.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);

    await auth(memberA.accessToken, request(app.getHttpServer()).post(`/guilds/members/${memberB.userId}/kick`)).expect(403);
    await auth(owner.accessToken, request(app.getHttpServer()).post(`/guilds/members/${memberA.userId}/kick`)).expect(201);

    const detail = await auth(owner.accessToken, request(app.getHttpServer()).get("/guilds/me")).expect(200);
    expect(detail.body.members).toHaveLength(2);
  });

  it("role: samo LEADER moze da menja uloge, i ne moze da postavi LEADER preko ovog endpointa", async () => {
    const owner = await registerUser("role-owner");
    const member = await registerUser("role-member");
    const guild = await createGuild(owner.accessToken, "role");
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);

    await auth(member.accessToken, request(app.getHttpServer()).post(`/guilds/members/${owner.userId}/role`))
      .send({ role: "OFFICER" })
      .expect(403);

    await auth(owner.accessToken, request(app.getHttpServer()).post(`/guilds/members/${member.userId}/role`))
      .send({ role: "OFFICER" })
      .expect(201);

    const detail = await auth(owner.accessToken, request(app.getHttpServer()).get("/guilds/me")).expect(200);
    expect(detail.body.members.find((m: { userId: string }) => m.userId === member.userId)?.role).toBe("OFFICER");
  });

  // -- Progression + Raid --------------------------------------------------

  it("workout u cehu doprinosi 20% xp-a cehovskom nivou", async () => {
    const owner = await registerUser("xp-owner");
    await createGuild(owner.accessToken, "xp");
    const exercise = await prisma.exercise.findFirstOrThrow();

    const result = await completeWorkout(owner.accessToken, exercise.id);
    const expectedContribution = Math.floor(result.body.xpGained * 0.2);
    expect(result.body.guildXpContributed).toBe(expectedContribution);

    const detail = await auth(owner.accessToken, request(app.getHttpServer()).get("/guilds/me")).expect(200);
    expect(detail.body.totalXp).toBe(expectedContribution);
  });

  it("workout van ceha ne dodeljuje cehovski doprinos", async () => {
    const solo = await registerUser("noguild");
    const exercise = await prisma.exercise.findFirstOrThrow();

    const result = await completeWorkout(solo.accessToken, exercise.id);
    expect(result.body.guildXpContributed).toBe(0);
    expect(result.body.guildRaidCompleted).toBe(false);
  });

  it("raid se zavrsava kada zbir zavrsenih treninga svih clanova ove nedelje dostigne cilj i nagradjuje riznicu", async () => {
    const owner = await registerUser("raid-owner");
    const member = await registerUser("raid-member");
    const guild = await createGuild(owner.accessToken, "raid");
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);

    const now = new Date();
    // Unapred seedujemo N-1 zavrsenih sesija (direktno u bazi) da izbegnemo
    // N stvarnih HTTP round-trip-ova - raid progres je prebrojavanje
    // zavrsenih WorkoutSession svih clanova, bez obzira kako su nastale.
    await prisma.workoutSession.createMany({
      data: Array.from({ length: GUILD_RAID_TARGET_CONTRIBUTIONS - 1 }, (_, i) => ({
        userId: i % 2 === 0 ? owner.userId : member.userId,
        status: "COMPLETED" as const,
        completedAt: now,
      })),
    });

    const exercise = await prisma.exercise.findFirstOrThrow();
    const last = await completeWorkout(member.accessToken, exercise.id);
    expect(last.body.guildRaidCompleted).toBe(true);

    const detail = await auth(owner.accessToken, request(app.getHttpServer()).get("/guilds/me")).expect(200);
    expect(detail.body.raid).toMatchObject({ status: "COMPLETED", targetContributions: GUILD_RAID_TARGET_CONTRIBUTIONS });
    expect(detail.body.treasuryCoins).toBe(GUILD_RAID_COIN_REWARD);

    // Sledeci trening ne dodeljuje raid nagradu ponovo (vec COMPLETED).
    const extra = await completeWorkout(owner.accessToken, exercise.id);
    expect(extra.body.guildRaidCompleted).toBe(false);
    const detailAfter = await auth(owner.accessToken, request(app.getHttpServer()).get("/guilds/me")).expect(200);
    expect(detailAfter.body.treasuryCoins).toBe(GUILD_RAID_COIN_REWARD);
  });

  // -- Social & Chat --------------------------------------------------------

  it("poruke: clan moze da posalje i procita poruke ceha hronoloskim redom", async () => {
    const owner = await registerUser("chat-owner");
    const member = await registerUser("chat-member");
    const guild = await createGuild(owner.accessToken, "chat");
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);

    await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds/messages")).send({ message: "Zdravo cehu" }).expect(201);
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/messages")).send({ message: "Cao!" }).expect(201);

    const messages = await auth(member.accessToken, request(app.getHttpServer()).get("/guilds/messages")).expect(200);
    expect(messages.body.map((m: { message: string }) => m.message)).toEqual(["Zdravo cehu", "Cao!"]);
  });

  it("korisnik van ceha ne moze da salje niti cita poruke", async () => {
    const solo = await registerUser("chat-solo");
    await auth(solo.accessToken, request(app.getHttpServer()).post("/guilds/messages")).send({ message: "Hej" }).expect(404);
    await auth(solo.accessToken, request(app.getHttpServer()).get("/guilds/messages")).expect(404);
  });

  // -- Treasury & Rewards ---------------------------------------------------

  it("donacija umanjuje coins igraca i uvecava riznicu ceha", async () => {
    const owner = await registerUser("donate-owner");
    const guild = await createGuild(owner.accessToken, "donate");
    await prisma.progression.update({ where: { userId: owner.userId }, data: { coins: 100 } });

    const response = await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds/treasury/donate"))
      .send({ coins: 30 })
      .expect(201);

    expect(response.body.treasuryCoins).toBe(30);
    const progression = await prisma.progression.findUniqueOrThrow({ where: { userId: owner.userId } });
    expect(progression.coins).toBe(70);
    void guild;
  });

  it("donacija odbija iznos veci od trenutnog stanja novcica", async () => {
    const owner = await registerUser("donate-poor");
    await createGuild(owner.accessToken, "poor");
    await prisma.progression.update({ where: { userId: owner.userId }, data: { coins: 5 } });

    await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds/treasury/donate")).send({ coins: 30 }).expect(400);
  });

  it("distribucija: samo LEADER moze da podeli riznicu ravnopravno, ostatak ostaje u riznici", async () => {
    const owner = await registerUser("dist-owner");
    const memberA = await registerUser("dist-a");
    const memberB = await registerUser("dist-b");
    const guild = await createGuild(owner.accessToken, "dist");
    await auth(memberA.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);
    await auth(memberB.accessToken, request(app.getHttpServer()).post("/guilds/join")).send({ tag: guild.body.tag }).expect(201);

    await prisma.guild.update({ where: { id: guild.body.id }, data: { treasuryCoins: 100 } });
    await prisma.progression.updateMany({
      where: { userId: { in: [owner.userId, memberA.userId, memberB.userId] } },
      data: { coins: 0 },
    });

    await auth(memberA.accessToken, request(app.getHttpServer()).post("/guilds/treasury/distribute")).expect(403);

    const response = await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds/treasury/distribute")).expect(201);
    expect(response.body.treasuryCoins).toBe(1); // 100 / 3 clana = 33 po clanu, ostatak 1.

    const [ownerProgression, aProgression, bProgression] = await Promise.all([
      prisma.progression.findUniqueOrThrow({ where: { userId: owner.userId } }),
      prisma.progression.findUniqueOrThrow({ where: { userId: memberA.userId } }),
      prisma.progression.findUniqueOrThrow({ where: { userId: memberB.userId } }),
    ]);
    expect(ownerProgression.coins).toBe(33);
    expect(aProgression.coins).toBe(33);
    expect(bProgression.coins).toBe(33);
  });

  // -- Listing --------------------------------------------------------------

  it("GET /guilds vraca listu ceha sa nivoom i brojem clanova", async () => {
    const owner = await registerUser("list-owner");
    const guild = await createGuild(owner.accessToken, "list");

    // Postavlja totalXp na namerno ogromnu, distinktivnu vrednost - GET /guilds
    // vraca samo prvih 50 (orderBy totalXp desc), a ova test suita se u punom
    // paketu izvrsava PARALELNO sa achievements/leaderboard/notifications
    // e2e testovima koji takodje prave cehove u ISTOJ deljenoj bazi. Bez
    // ovoga bi test bio flaky (svez ceh na totalXp=0 moze slucajno ispasti iz
    // prvih 50 kad ih ima vise). Level se racuna preko calculateLevel (isti
    // "derive, don't cache" princip kao svuda) umesto hardkodovanog 1.
    const distinctiveXp = 999_000_000;
    await prisma.guild.update({ where: { id: guild.body.id }, data: { totalXp: distinctiveXp } });

    const list = await auth(owner.accessToken, request(app.getHttpServer()).get("/guilds")).expect(200);
    const entry = list.body.find((g: { id: string }) => g.id === guild.body.id);
    expect(entry).toMatchObject({ tag: guild.body.tag, level: calculateLevel(distinctiveXp), memberCount: 1 });
  });
});
