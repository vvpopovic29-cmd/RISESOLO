import { ACHIEVEMENT_DEFINITIONS } from "@risesolo/domain";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { AchievementsService } from "./achievements.service";

interface PrismaOverrides {
  progression?: { totalXp: number; currentStreak: number };
  workoutsCompleted?: number;
  dailyQuestsCompleted?: number;
  bossQuestsCompleted?: number;
  nutritionEntriesLogged?: number;
  trainingPlansGenerated?: number;
  guildJoined?: boolean;
  alreadyUnlockedIds?: string[];
}

function makePrisma(overrides: PrismaOverrides = {}) {
  const {
    progression = { totalXp: 0, currentStreak: 0 },
    workoutsCompleted = 0,
    dailyQuestsCompleted = 0,
    bossQuestsCompleted = 0,
    nutritionEntriesLogged = 0,
    trainingPlansGenerated = 0,
    guildJoined = false,
    alreadyUnlockedIds = [],
  } = overrides;

  const xpEventCount = jest.fn().mockImplementation(({ where }: { where: { source: string } }) => {
    if (where.source === "WORKOUT_COMPLETE") return Promise.resolve(workoutsCompleted);
    if (where.source === "DAILY_QUEST_COMPLETE") return Promise.resolve(dailyQuestsCompleted);
    return Promise.resolve(bossQuestsCompleted);
  });

  return {
    progression: { findUniqueOrThrow: jest.fn().mockResolvedValue(progression) },
    xpEvent: { count: xpEventCount },
    nutritionEntry: { count: jest.fn().mockResolvedValue(nutritionEntriesLogged) },
    trainingPlan: { count: jest.fn().mockResolvedValue(trainingPlansGenerated) },
    guildMembership: { findUnique: jest.fn().mockResolvedValue(guildJoined ? { userId: "user-1" } : null) },
    userAchievement: makeUserAchievementStore(alreadyUnlockedIds),
  } as unknown as PrismaService;
}

/** In-memory "tabela" - `listForUser` ocitava rezultate `evaluateAndUnlock`-a koji su upravo upisani preko `createMany` u istom pozivu. */
function makeUserAchievementStore(initialIds: string[]) {
  const unlockedAt = new Map<string, Date>(initialIds.map((id) => [id, new Date("2026-01-01")]));
  return {
    findMany: jest.fn().mockImplementation(() =>
      Promise.resolve(Array.from(unlockedAt.entries()).map(([achievementId, at]) => ({ achievementId, unlockedAt: at }))),
    ),
    createMany: jest.fn().mockImplementation(({ data }: { data: { achievementId: string }[] }) => {
      for (const row of data) {
        if (!unlockedAt.has(row.achievementId)) {
          unlockedAt.set(row.achievementId, new Date());
        }
      }
      return Promise.resolve({ count: data.length });
    }),
  };
}

function makeNotifications() {
  return { sendToUser: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
}

describe("AchievementsService", () => {
  describe("evaluateAndUnlock", () => {
    it("ne otkljucava nista i ne pise u bazu kada nijedan uslov nije ispunjen", async () => {
      const prisma = makePrisma();
      const service = new AchievementsService(prisma, makeNotifications());

      const newlyUnlocked = await service.evaluateAndUnlock("user-1");

      expect(newlyUnlocked).toEqual([]);
      expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    });

    it("otkljucava i perzistira sve ispunjene achievement-e (skipDuplicates za race-safety)", async () => {
      const prisma = makePrisma({ workoutsCompleted: 1 });
      const service = new AchievementsService(prisma, makeNotifications());

      const newlyUnlocked = await service.evaluateAndUnlock("user-1");

      expect(newlyUnlocked).toEqual(["FIRST_WORKOUT"]);
      expect(prisma.userAchievement.createMany).toHaveBeenCalledWith({
        data: [{ userId: "user-1", achievementId: "FIRST_WORKOUT" }],
        skipDuplicates: true,
      });
    });

    it("preskace achievement koji je vec otkljucan", async () => {
      const prisma = makePrisma({ workoutsCompleted: 1, alreadyUnlockedIds: ["FIRST_WORKOUT"] });
      const service = new AchievementsService(prisma, makeNotifications());

      const newlyUnlocked = await service.evaluateAndUnlock("user-1");

      expect(newlyUnlocked).toEqual([]);
      expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    });

    it("otkljucava vise achievement-a odjednom kada snapshot ispunjava vise pragova", async () => {
      const prisma = makePrisma({ workoutsCompleted: 10, guildJoined: true });
      const service = new AchievementsService(prisma, makeNotifications());

      const newlyUnlocked = await service.evaluateAndUnlock("user-1");

      expect(newlyUnlocked).toEqual(expect.arrayContaining(["FIRST_WORKOUT", "WORKOUTS_10", "GUILD_JOIN"]));
      expect(newlyUnlocked).toHaveLength(3);
    });
  });

  describe("notifyNewlyUnlocked", () => {
    it("salje po jednu push notifikaciju za svaki achievement id", async () => {
      const notifications = makeNotifications();
      const service = new AchievementsService(makePrisma(), notifications);

      await service.notifyNewlyUnlocked("user-1", ["FIRST_WORKOUT", "GUILD_JOIN"]);

      expect(notifications.sendToUser).toHaveBeenCalledTimes(2);
      expect(notifications.sendToUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ data: { screen: "/achievements" } }),
      );
    });

    it("ne salje nista za prazan niz", async () => {
      const notifications = makeNotifications();
      const service = new AchievementsService(makePrisma(), notifications);

      await service.notifyNewlyUnlocked("user-1", []);

      expect(notifications.sendToUser).not.toHaveBeenCalled();
    });
  });

  describe("listForUser", () => {
    it("vraca ceo katalog sa unlocked flagom, prethodno sustizuci propustene unlock-ove", async () => {
      const prisma = makePrisma({ workoutsCompleted: 1 });
      const service = new AchievementsService(prisma, makeNotifications());

      const catalog = await service.listForUser("user-1");

      expect(catalog).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
      const firstWorkout = catalog.find((a) => a.id === "FIRST_WORKOUT");
      expect(firstWorkout?.unlocked).toBe(true);
      expect(firstWorkout?.unlockedAt).not.toBeNull();
      const workouts10 = catalog.find((a) => a.id === "WORKOUTS_10");
      expect(workouts10?.unlocked).toBe(false);
      expect(workouts10?.unlockedAt).toBeNull();
    });
  });
});
