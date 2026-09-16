import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ACHIEVEMENT_DEFINITIONS } from "@risesolo/domain";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { NotificationsService } from "../src/notifications/notifications.service";

/**
 * Achievements/badges - vidi apps/api/src/achievements. Push slanje je
 * spy-ovano (isti obrazac kao notifications.e2e-spec.ts) - ovde se proverava
 * da li su trigeri (workout complete, nutrition log, guild join) ispravno
 * ozicani i da GET /achievements ispravno "sustize" propustene unlock-ove.
 */
describe("Achievements (e2e)", () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const createdUserIds: string[] = [];
  const runId = Math.random().toString(36).slice(2, 8);
  let userSeq = 0;
  let sendToUserSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    const notificationsService = moduleFixture.get(NotificationsService);
    sendToUserSpy = jest.spyOn(notificationsService, "sendToUser").mockResolvedValue(undefined);
  });

  afterEach(() => {
    sendToUserSpy.mockClear();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
    sendToUserSpy.mockRestore();
    await app.close();
  });

  async function registerUser(suffix: string): Promise<{ accessToken: string; userId: string }> {
    userSeq += 1;
    const email = `test-${runId}-${suffix}-${userSeq}@risesolo.test`;
    const username = `ach${runId}${suffix.replace(/[^a-zA-Z0-9]/g, "")}${userSeq}`.slice(0, 24);
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

  async function getAchievements(accessToken: string): Promise<request.Response> {
    return auth(accessToken, request(app.getHttpServer()).get("/achievements")).expect(200);
  }

  function findAchievement(body: { id: string; unlocked: boolean; unlockedAt: string | null }[], id: string) {
    return body.find((a) => a.id === id);
  }

  /**
   * Achievement evaluacija je fire-and-forget POSLE HTTP odgovora (isti
   * princip kao push trigeri u WorkoutsService) - kratko pollovanje umesto
   * fiksnog sleep-a da izbegnemo trku sa testom.
   */
  async function waitUntil(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
    const start = Date.now();
    while (!predicate() && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async function completeWorkout(accessToken: string, exerciseId: string): Promise<request.Response> {
    const session = await auth(accessToken, request(app.getHttpServer()).post("/workouts/sessions")).send({}).expect(201);
    await auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/sets`))
      .send({ exerciseId, setNumber: 1, reps: 10, completed: true })
      .expect(204);
    return auth(accessToken, request(app.getHttpServer()).post(`/workouts/sessions/${session.body.id}/complete`)).expect(201);
  }

  it("odbija pristup bez tokena (401)", async () => {
    await request(app.getHttpServer()).get("/achievements").expect(401);
  });

  it("vraca ceo katalog zakljucan za sveze registrovanog korisnika", async () => {
    const { accessToken } = await registerUser("fresh");

    const response = await getAchievements(accessToken);

    expect(response.body).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
    expect((response.body as { unlocked: boolean }[]).every((a) => a.unlocked === false)).toBe(true);
  });

  it("otkljucava FIRST_WORKOUT posle prvog zavrsenog treninga i salje push tacno jednom", async () => {
    const { accessToken, userId } = await registerUser("workout");
    const exercise = await prisma.exercise.findFirstOrThrow();

    const isFirstWorkoutPush = (call: unknown[]) =>
      call[0] === userId && (call[1] as { title: string }).title.includes("Prvi trening");

    await completeWorkout(accessToken, exercise.id);
    await waitUntil(() => sendToUserSpy.mock.calls.some(isFirstWorkoutPush));
    await completeWorkout(accessToken, exercise.id);
    await waitUntil(() => false, 100); // ostavi prostora eventualnom (pogresnom) duplikatu da stigne

    const response = await getAchievements(accessToken);
    expect(findAchievement(response.body, "FIRST_WORKOUT")).toMatchObject({ unlocked: true });
    expect(findAchievement(response.body, "WORKOUTS_10")).toMatchObject({ unlocked: false });

    expect(sendToUserSpy.mock.calls.filter(isFirstWorkoutPush)).toHaveLength(1);
  });

  it("otkljucava NUTRITION_FIRST posle prvog unosa u dnevnik ishrane", async () => {
    const { accessToken } = await registerUser("nutrition");

    await auth(accessToken, request(app.getHttpServer()).post("/nutrition/entries"))
      .send({ date: "2026-03-10", mealType: "BREAKFAST", name: "Ovsena kasa", calories: 300, proteinG: 10, carbsG: 40, fatG: 5 })
      .expect(201);

    const response = await getAchievements(accessToken);
    expect(findAchievement(response.body, "NUTRITION_FIRST")).toMatchObject({ unlocked: true });
  });

  it("otkljucava GUILD_JOIN i za osnivaca i za clana koji se pridruzi", async () => {
    const owner = await registerUser("guild-owner");
    const member = await registerUser("guild-member");
    const guildTag = `${runId.slice(0, 4)}AC`.toUpperCase();

    await auth(owner.accessToken, request(app.getHttpServer()).post("/guilds"))
      .send({ name: `Achievement Guild ${runId}`, tag: guildTag })
      .expect(201);
    await auth(member.accessToken, request(app.getHttpServer()).post("/guilds/join"))
      .send({ tag: guildTag })
      .expect(201);

    const ownerAchievements = await getAchievements(owner.accessToken);
    const memberAchievements = await getAchievements(member.accessToken);
    expect(findAchievement(ownerAchievements.body, "GUILD_JOIN")).toMatchObject({ unlocked: true });
    expect(findAchievement(memberAchievements.body, "GUILD_JOIN")).toMatchObject({ unlocked: true });
  });

  it("GET /achievements retroaktivno sustize achievement-e otkljucane van triggera (lazy evaluacija)", async () => {
    const { accessToken, userId } = await registerUser("lazy");

    // Simulira 10 vec zavrsenih treninga direktno preko XpEvent ledger-a
    // (isti "izvor istine" koji AchievementsService koristi za brojanje) -
    // bez prolaska kroz stvarni workout completion flow.
    await prisma.xpEvent.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        userId,
        source: "WORKOUT_COMPLETE" as const,
        sourceId: `seed-${runId}-${i}`,
        amount: 10,
      })),
    });

    const response = await getAchievements(accessToken);
    expect(findAchievement(response.body, "FIRST_WORKOUT")).toMatchObject({ unlocked: true });
    expect(findAchievement(response.body, "WORKOUTS_10")).toMatchObject({ unlocked: true });
    expect(findAchievement(response.body, "WORKOUTS_50")).toMatchObject({ unlocked: false });
  });

  it("ostaje otkljucano zauvek cak i kad statistika kasnije padne (npr. streak resetuje)", async () => {
    const { accessToken, userId } = await registerUser("permanent");

    await prisma.progression.update({ where: { userId }, data: { currentStreak: 3 } });
    const afterStreak = await getAchievements(accessToken);
    expect(findAchievement(afterStreak.body, "STREAK_3")).toMatchObject({ unlocked: true });

    await prisma.progression.update({ where: { userId }, data: { currentStreak: 0 } });
    const afterReset = await getAchievements(accessToken);
    expect(findAchievement(afterReset.body, "STREAK_3")).toMatchObject({ unlocked: true });
  });
});
