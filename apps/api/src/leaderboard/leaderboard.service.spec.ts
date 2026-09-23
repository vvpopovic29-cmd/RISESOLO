import { calculateLevel, calculateRank } from "@risesolo/domain";
import type { CacheService } from "../cache/cache.service";
import type { PrismaService } from "../prisma/prisma.service";
import { LeaderboardService } from "./leaderboard.service";

function makeCache(): CacheService {
  return {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService;
}

interface ProgressionRow {
  userId: string;
  totalXp: number;
  username: string;
}

function makePrisma(rows: ProgressionRow[], overrides: Partial<Record<string, unknown>> = {}) {
  const sorted = [...rows].sort((a, b) => b.totalXp - a.totalXp);

  return {
    progression: {
      findMany: jest.fn().mockImplementation(({ take }: { take: number }) =>
        Promise.resolve(
          sorted.slice(0, take).map((row) => ({
            userId: row.userId,
            totalXp: row.totalXp,
            user: { profile: { username: row.username } },
          })),
        ),
      ),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { userId: string } }) => {
        const row = rows.find((r) => r.userId === where.userId);
        return Promise.resolve(row ? { userId: row.userId, totalXp: row.totalXp } : null);
      }),
      count: jest.fn().mockImplementation(({ where }: { where: { totalXp: { gt: number } } }) =>
        Promise.resolve(rows.filter((r) => r.totalXp > where.totalXp.gt).length),
      ),
    },
    profile: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { userId: string } }) => {
        const row = rows.find((r) => r.userId === where.userId);
        return Promise.resolve(row ? { userId: row.userId, username: row.username } : null);
      }),
    },
    guild: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn(),
    },
    guildMembership: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as unknown as PrismaService;
}

describe("LeaderboardService", () => {
  describe("getPlayerLeaderboard", () => {
    it("vraca top N igraca sortirane po totalXp sa ispravnim pozicijama", async () => {
      const prisma = makePrisma([
        { userId: "u1", totalXp: 5000, username: "prvi" },
        { userId: "u2", totalXp: 3000, username: "drugi" },
        { userId: "u3", totalXp: 1000, username: "treci" },
      ]);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getPlayerLeaderboard("u1", 2);

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0]).toMatchObject({ position: 1, userId: "u1", username: "prvi", totalXp: 5000 });
      expect(result.entries[1]).toMatchObject({ position: 2, userId: "u2", username: "drugi", totalXp: 3000 });
    });

    it("racuna level/rank preko domain funkcija", async () => {
      const prisma = makePrisma([{ userId: "u1", totalXp: 5000, username: "prvi" }]);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getPlayerLeaderboard("u1", 10);

      const expectedLevel = calculateLevel(5000);
      expect(result.entries[0]).toMatchObject({ level: expectedLevel, rank: calculateRank(expectedLevel) });
    });

    it("'me' je ista referenca kao entry kada je korisnik unutar top N", async () => {
      const prisma = makePrisma([
        { userId: "u1", totalXp: 5000, username: "prvi" },
        { userId: "u2", totalXp: 3000, username: "drugi" },
      ]);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getPlayerLeaderboard("u2", 10);

      expect(result.me).toMatchObject({ position: 2, userId: "u2" });
    });

    it("racuna 'me' poziciju van top N preko count(totalXp > moj)", async () => {
      const prisma = makePrisma([
        { userId: "u1", totalXp: 5000, username: "prvi" },
        { userId: "u2", totalXp: 3000, username: "drugi" },
        { userId: "u3", totalXp: 1000, username: "treci" },
      ]);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getPlayerLeaderboard("u3", 1);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.userId).toBe("u1");
      expect(result.me).toMatchObject({ position: 3, userId: "u3", totalXp: 1000 });
    });
  });

  describe("getGuildLeaderboard", () => {
    it("vraca top cehove sortirane po totalXp sa memberCount preko _count", async () => {
      const prisma = makePrisma([]);
      (prisma.guild.findMany as jest.Mock).mockResolvedValue([
        { id: "g1", name: "Alpha", tag: "ALP", totalXp: 9000, _count: { members: 5 } },
        { id: "g2", name: "Beta", tag: "BET", totalXp: 4000, _count: { members: 3 } },
      ]);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getGuildLeaderboard("u1", 10);

      expect(result.entries).toEqual([
        expect.objectContaining({ position: 1, guildId: "g1", name: "Alpha", tag: "ALP", totalXp: 9000, memberCount: 5 }),
        expect.objectContaining({ position: 2, guildId: "g2", name: "Beta", tag: "BET", totalXp: 4000, memberCount: 3 }),
      ]);
    });

    it("myGuild je null kada korisnik nije clan nijednog ceha", async () => {
      const prisma = makePrisma([]);
      (prisma.guild.findMany as jest.Mock).mockResolvedValue([]);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getGuildLeaderboard("u1", 10);

      expect(result.myGuild).toBeNull();
    });

    it("racuna myGuild poziciju van top N preko count(totalXp > guildov)", async () => {
      const prisma = makePrisma([]);
      (prisma.guild.findMany as jest.Mock).mockResolvedValue([
        { id: "g1", name: "Alpha", tag: "ALP", totalXp: 9000, _count: { members: 5 } },
      ]);
      (prisma.guildMembership.findUnique as jest.Mock).mockResolvedValue({ guildId: "g2" });
      (prisma.guild.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        id: "g2",
        name: "Beta",
        tag: "BET",
        totalXp: 2000,
        _count: { members: 3 },
      });
      (prisma.guild.count as jest.Mock).mockResolvedValue(1);
      const service = new LeaderboardService(prisma, makeCache());

      const result = await service.getGuildLeaderboard("u1", 1);

      expect(result.myGuild).toMatchObject({ position: 2, guildId: "g2", totalXp: 2000, memberCount: 3 });
    });
  });
});
