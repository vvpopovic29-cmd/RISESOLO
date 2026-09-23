import { Injectable, NotFoundException } from "@nestjs/common";
import { calculateLevel, calculateRank } from "@risesolo/domain";
import type {
  GuildLeaderboardEntryDto,
  GuildLeaderboardResponseDto,
  PlayerLeaderboardEntryDto,
  PlayerLeaderboardResponseDto,
} from "@risesolo/validation";
import { CacheService } from "../cache/cache.service";
import { PrismaService } from "../prisma/prisma.service";

interface GuildTotals {
  id: string;
  name: string;
  tag: string;
  totalXp: number;
}

const LEADERBOARD_CACHE_TTL_SECONDS = 30;

/**
 * Top-N `entries` (deljene, ne-per-user) se kratko kesiraju preko CacheService
 * (vidi README "Rate Limiting & Monitoring") - `me`/`myGuild` ostaju live jer
 * su jeftini PK lookup-i i inherentno ne-deljivi izmedju korisnika. Na MVP
 * skali (stotine-hiljade redova) `ORDER BY total_xp DESC LIMIT N` je i bez
 * kesa dovoljno brz preko postojeceg indeksa na PK; `position` van top liste
 * se racuna preko `count(totalXp > moj)`, sto je "dense-ish" rangiranje -
 * izjednaceni total_xp deli istu poziciju.
 */
@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getPlayerLeaderboard(userId: string, limit: number): Promise<PlayerLeaderboardResponseDto> {
    const entries = await this.getTopPlayerEntries(limit);

    const existing = entries.find((entry) => entry.userId === userId);
    const me = existing ?? (await this.buildOwnPlayerEntry(userId));

    return { entries, me };
  }

  private async getTopPlayerEntries(limit: number): Promise<PlayerLeaderboardEntryDto[]> {
    const cacheKey = `leaderboard:players:${limit}`;
    const cached = await this.cacheService.getJson<PlayerLeaderboardEntryDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const topRows = await this.prisma.progression.findMany({
      orderBy: { totalXp: "desc" },
      take: limit,
      include: { user: { include: { profile: true } } },
    });

    const entries: PlayerLeaderboardEntryDto[] = [];
    topRows.forEach((row, index) => {
      if (row.user.profile) {
        entries.push(toPlayerEntry(row.userId, row.user.profile.username, row.totalXp, index + 1));
      }
    });

    await this.cacheService.setJson(cacheKey, entries, LEADERBOARD_CACHE_TTL_SECONDS);
    return entries;
  }

  private async buildOwnPlayerEntry(userId: string): Promise<PlayerLeaderboardEntryDto> {
    const [progression, profile] = await Promise.all([
      this.prisma.progression.findUnique({ where: { userId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
    ]);
    if (!progression || !profile) {
      throw new NotFoundException("Profil igraca nije pronadjen");
    }

    const higherCount = await this.prisma.progression.count({ where: { totalXp: { gt: progression.totalXp } } });
    return toPlayerEntry(userId, profile.username, progression.totalXp, higherCount + 1);
  }

  async getGuildLeaderboard(userId: string, limit: number): Promise<GuildLeaderboardResponseDto> {
    const entries = await this.getTopGuildEntries(limit);

    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      return { entries, myGuild: null };
    }

    const existing = entries.find((entry) => entry.guildId === membership.guildId);
    const myGuild = existing ?? (await this.buildOwnGuildEntry(membership.guildId));

    return { entries, myGuild };
  }

  private async getTopGuildEntries(limit: number): Promise<GuildLeaderboardEntryDto[]> {
    const cacheKey = `leaderboard:guilds:${limit}`;
    const cached = await this.cacheService.getJson<GuildLeaderboardEntryDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const topGuilds = await this.prisma.guild.findMany({
      orderBy: { totalXp: "desc" },
      take: limit,
      include: { _count: { select: { members: true } } },
    });
    const entries = topGuilds.map((guild, index) => toGuildEntry(guild, guild._count.members, index + 1));

    await this.cacheService.setJson(cacheKey, entries, LEADERBOARD_CACHE_TTL_SECONDS);
    return entries;
  }

  private async buildOwnGuildEntry(guildId: string): Promise<GuildLeaderboardEntryDto> {
    const guild = await this.prisma.guild.findUniqueOrThrow({
      where: { id: guildId },
      include: { _count: { select: { members: true } } },
    });

    const higherCount = await this.prisma.guild.count({ where: { totalXp: { gt: guild.totalXp } } });
    return toGuildEntry(guild, guild._count.members, higherCount + 1);
  }
}

function toPlayerEntry(userId: string, username: string, totalXp: number, position: number): PlayerLeaderboardEntryDto {
  const level = calculateLevel(totalXp);
  return { position, userId, username, level, rank: calculateRank(level), totalXp };
}

function toGuildEntry(guild: GuildTotals, memberCount: number, position: number): GuildLeaderboardEntryDto {
  return {
    position,
    guildId: guild.id,
    name: guild.name,
    tag: guild.tag,
    level: calculateLevel(guild.totalXp),
    totalXp: guild.totalXp,
    memberCount,
  };
}
