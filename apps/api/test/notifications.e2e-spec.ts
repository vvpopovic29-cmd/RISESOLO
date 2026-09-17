import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { GUILD_RAID_TARGET_CONTRIBUTIONS } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { NotificationsService } from "../src/notifications/notifications.service";

/**
 * Push notifications - registracija/deregistracija tokena radi protiv prave
 * baze; stvarno slanje (Expo push API poziv) je jedinicno testirano u
 * notifications.service.spec.ts. Ovde spy-ujemo NotificationsService da
 * proverimo da su trigeri (Boss Quest/Guild Raid/kick) OZICANI ispravno,
 * bez stvarnog mreznog poziva ka Expo servisu - vidi
 * apps/api/src/workouts/workouts.service.ts i apps/api/src/guilds/guilds.service.ts.
 */
describe("Notifications (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;
  let notificationsService: NotificationsService;
  let sendToUserSpy: jest.SpyInstance;
  let sendToUsersSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    notificationsService = moduleFixture.get(NotificationsService);
  });

  beforeEach(() => {
    sendToUserSpy = jest.spyOn(notificationsService, "sendToUser").mockResolvedValue(undefined);
    sendToUsersSpy = jest.spyOn(notificationsService, "sendToUsers").mockResolvedValue(undefined);
  });

  afterEach(() => {
    sendToUserSpy.mockRestore();
    sendToUsersSpy.mockRestore();
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
    const username = `notif${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  /**
   * Guild raid/kick notifikacije se salju POSLE glavne transakcije, bez
   * `await` u pozivaocu (fire-and-forget - vidi WorkoutsService.completeSession),
   * pa spy poziv moze da stigne par tick-ova nakon sto HTTP odgovor vec
   * stigne testu. Kratko pollovanje umesto fiksnog sleep-a.
   */
  async function waitForSpyCall(spy: jest.SpyInstance, timeoutMs = 1000): Promise<void> {
    const start = Date.now();
    while (spy.mock.calls.length === 0 && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer())
      .post("/notifications/push-token")
      .send({ token: "ExponentPushToken[xxx]", platform: "IOS" })
      .expect(401);
  });

  it("registruje push token za korisnika", async () => {
    const { accessToken, userId } = await registerUser("register");
    const token = `ExponentPushToken[${runId}-register]`;

    await auth(accessToken, request(app.getHttpServer()).post("/notifications/push-token"))
      .send({ token, platform: "IOS" })
      .expect(204);

    const row = await prisma.pushToken.findUnique({ where: { token } });
    expect(row).toMatchObject({ userId, platform: "IOS" });
  });

  it("odbacuje nevalidnu platformu (400)", async () => {
    const { accessToken } = await registerUser("badplatform");

    await auth(accessToken, request(app.getHttpServer()).post("/notifications/push-token"))
      .send({ token: "ExponentPushToken[bad]", platform: "WINDOWS_PHONE" })
      .expect(400);
  });

  it("re-registracija istog tokena za drugog korisnika prebacuje vlasnistvo", async () => {
    const first = await registerUser("owner1");
    const second = await registerUser("owner2");
    const token = `ExponentPushToken[${runId}-shared-device]`;

    await auth(first.accessToken, request(app.getHttpServer()).post("/notifications/push-token"))
      .send({ token, platform: "ANDROID" })
      .expect(204);
    await auth(second.accessToken, request(app.getHttpServer()).post("/notifications/push-token"))
      .send({ token, platform: "ANDROID" })
      .expect(204);

    const row = await prisma.pushToken.findUnique({ where: { token } });
    expect(row?.userId).toBe(second.userId);
  });

  it("odjavljuje SAMO sopstveni token (ownership provera)", async () => {
    const owner = await registerUser("unreg-owner");
    const intruder = await registerUser("unreg-intruder");
    const token = `ExponentPushToken[${runId}-unregister]`;
    await auth(owner.accessToken, request(app.getHttpServer()).post("/notifications/push-token"))
      .send({ token, platform: "IOS" })
      .expect(204);

    // Tudji pokusaj brisanja ne diraju tudji token (nema greske, samo nema efekta).
    await auth(intruder.accessToken, request(app.getHttpServer()).delete("/notifications/push-token"))
      .send({ token })
      .expect(204);
    expect(await prisma.pushToken.findUnique({ where: { token } })).not.toBeNull();

    await auth(owner.accessToken, request(app.getHttpServer()).delete("/notifications/push-token"))
      .send({ token })
      .expect(204);
    expect(await prisma.pushToken.findUnique({ where: { token } })).toBeNull();
  });

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  it("salje push korisniku kada zavrsi Boss Quest", async () => {
    const { accessToken, userId } = await registerUser("bossquest");
    const exercise = await prisma.exercise.findFirstOrThrow();

    await completeWorkout(accessToken, exercise.id);
    await completeWorkout(accessToken, exercise.id);
    const third = await completeWorkout(accessToken, exercise.id);
    expect(third.body.bossQuestCompleted).toBe(true);

    expect(sendToUserSpy).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ title: expect.stringContaining("Boss Quest") }),
    );
  });

  it("salje push SVIM clanovima ceha kada se zavrsi cehovski raid", async () => {
    const owner = await registerUser("raid-owner");
    const member = await registerUser("raid-member");
    const guildTag = `${runId.slice(0, 4)}R1`.toUpperCase();
    const guild = await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: `Raid Guild ${runId}`, tag: guildTag })
      .expect(201);
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join"))
      .send({ tag: guildTag })
      .expect(201);

    await prisma.workoutSession.createMany({
      data: Array.from({ length: GUILD_RAID_TARGET_CONTRIBUTIONS - 1 }, (_, i) => ({
        userId: i % 2 === 0 ? owner.userId : member.userId,
        status: "COMPLETED" as const,
        completedAt: new Date(),
      })),
    });

    const exercise = await prisma.exercise.findFirstOrThrow();
    sendToUsersSpy.mockClear();
    const last = await completeWorkout(member.accessToken, exercise.id);
    expect(last.body.guildRaidCompleted).toBe(true);

    await waitForSpyCall(sendToUsersSpy);
    expect(sendToUsersSpy).toHaveBeenCalledWith(
      expect.arrayContaining([owner.userId, member.userId]),
      expect.objectContaining({ title: expect.stringContaining("raid") }),
    );
    void guild;
  });

  it("salje push izbacenom clanu ceha", async () => {
    const owner = await registerUser("kick-owner");
    const member = await registerUser("kick-member");
    const guildTag = `${runId.slice(0, 4)}K1`.toUpperCase();
    await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: `Kick Guild ${runId}`, tag: guildTag })
      .expect(201);
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join"))
      .send({ tag: guildTag })
      .expect(201);

    await auth(owner.accessToken, request(app.getHttpServer()).post(`/guilds/members/${member.userId}/kick`)).expect(201);

    expect(sendToUserSpy).toHaveBeenCalledWith(
      member.userId,
      expect.objectContaining({ title: expect.stringContaining("Izbacen") }),
    );
  });

  it("salje push primaocu kada dobije zahtev za prijateljstvo", async () => {
    const sender = await registerUser("freqsend");
    const receiver = await registerUser("freqrecv");

    await auth(sender.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: (await prisma.profile.findUniqueOrThrow({ where: { userId: receiver.userId } })).username })
      .expect(201);

    expect(sendToUserSpy).toHaveBeenCalledWith(
      receiver.userId,
      expect.objectContaining({ title: expect.stringContaining("zahtev za prijateljstvo") }),
    );
  });

  it("salje push posiljaocu kada mu se prihvati zahtev za prijateljstvo", async () => {
    const sender = await registerUser("faccsend");
    const receiver = await registerUser("faccrecv");
    const receiverUsername = (await prisma.profile.findUniqueOrThrow({ where: { userId: receiver.userId } })).username;

    const created = await auth(sender.accessToken, request(app.getHttpServer()).post("/friends/requests"))
      .send({ username: receiverUsername })
      .expect(201);

    sendToUserSpy.mockClear();
    await auth(receiver.accessToken, request(app.getHttpServer()).post(`/friends/requests/${created.body.id}/accept`)).expect(201);

    expect(sendToUserSpy).toHaveBeenCalledWith(
      sender.userId,
      expect.objectContaining({ title: expect.stringContaining("prihvacen") }),
    );
  });
});
