import { calculateLevel } from "@risesolo/domain";
import type { AchievementsService } from "../achievements/achievements.service";
import type { CacheService } from "../cache/cache.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { GuildsService } from "./guilds.service";

function makePrisma(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    guild: {
      findMany: jest.fn().mockResolvedValue([]),
      ...overrides,
    },
  } as unknown as PrismaService;
}

function makeCache(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    getJson: jest.fn().mockResolvedValue(null),
    setJson: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as CacheService;
}

const notificationsService = {} as NotificationsService;
const achievementsService = {} as AchievementsService;

describe("GuildsService.listGuilds", () => {
  it("vraca kesirane podatke bez upita bazi kada su prisutni u kesu", async () => {
    const cachedList = [{ id: "g1", name: "Alpha", tag: "ALP", level: 3, memberCount: 4 }];
    const prisma = makePrisma();
    const cache = makeCache({ getJson: jest.fn().mockResolvedValue(cachedList) });
    const service = new GuildsService(prisma, notificationsService, achievementsService, cache);

    const result = await service.listGuilds();

    expect(result).toEqual(cachedList);
    expect(prisma.guild.findMany).not.toHaveBeenCalled();
  });

  it("na promasaj kesa cita iz baze i popunjava kes", async () => {
    const totalXp = 5000;
    const prisma = makePrisma({
      findMany: jest.fn().mockResolvedValue([
        { id: "g1", name: "Alpha", tag: "ALP", totalXp, _count: { members: 4 } },
      ]),
    });
    const cache = makeCache();
    const service = new GuildsService(prisma, notificationsService, achievementsService, cache);

    const result = await service.listGuilds();

    expect(result).toEqual([{ id: "g1", name: "Alpha", tag: "ALP", level: calculateLevel(totalXp), memberCount: 4 }]);
    expect(cache.setJson).toHaveBeenCalledWith("guilds:list", result, 30);
  });
});
