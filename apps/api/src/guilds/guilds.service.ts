import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  GUILD_MEMBER_CAP,
  GUILD_RAID_COIN_REWARD,
  GUILD_RAID_TARGET_CONTRIBUTIONS,
  calculateCurrentLevelXP,
  calculateGuildXpContribution,
  calculateLevel,
  calculateProgress,
  calculateRequiredXP,
  canChangeRole,
  canDistributeTreasury,
  canKick,
  distributeTreasury,
  isGuildRaidComplete,
  selectNextLeader,
} from "@risesolo/domain";
import type {
  ChangeGuildMemberRoleRequest,
  CreateGuildRequest,
  DonateToGuildRequest,
  GuildDetailDto,
  GuildMemberDto,
  GuildMessageDto,
  GuildRaidDto,
  GuildSummaryDto,
  JoinGuildRequest,
  PostGuildMessageRequest,
} from "@risesolo/validation";
import type { GuildMembership, GuildRaid, Prisma } from "@prisma/client";
import { startOfIsoWeek } from "../common/date";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

interface MembershipWithUsername extends GuildMembership {
  user: { profile: { username: string } | null };
}

@Injectable()
export class GuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // -- Guild Management -------------------------------------------------

  async createGuild(userId: string, dto: CreateGuildRequest): Promise<GuildDetailDto> {
    await this.assertNotInGuild(userId);

    try {
      await this.prisma.$transaction(async (tx) => {
        const guild = await tx.guild.create({
          data: { name: dto.name, tag: dto.tag, description: dto.description ?? null },
        });
        await tx.guildMembership.create({
          data: { guildId: guild.id, userId, role: "LEADER" },
        });
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Ime ili tag ceha su vec zauzeti");
      }
      throw error;
    }

    return this.getGuildDetail(userId);
  }

  async joinGuild(userId: string, dto: JoinGuildRequest): Promise<GuildDetailDto> {
    await this.assertNotInGuild(userId);

    const guild = await this.prisma.guild.findUnique({
      where: { tag: dto.tag },
      include: { _count: { select: { members: true } } },
    });
    if (!guild) {
      throw new NotFoundException("Ceh sa tim tagom nije pronadjen");
    }
    if (guild._count.members >= GUILD_MEMBER_CAP) {
      throw new BadRequestException("Ceh je popunjen");
    }

    try {
      await this.prisma.guildMembership.create({
        data: { guildId: guild.id, userId, role: "MEMBER" },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Vec si clan nekog ceha");
      }
      throw error;
    }

    return this.getGuildDetail(userId);
  }

  /**
   * Ako je poslednji clan, ceh se brise (cascade uklanja clanstva/poruke/
   * raid-ove). Ako odlazi LEADER a ceh ostaje, nasledjuje ga
   * `selectNextLeader` (najstariji OFFICER, ili najstariji clan ako nema
   * OFFICER-a).
   */
  async leaveGuild(userId: string): Promise<void> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }

    const otherMembers = await this.prisma.guildMembership.findMany({
      where: { guildId: membership.guildId, userId: { not: userId } },
    });

    if (otherMembers.length === 0) {
      await this.prisma.guild.delete({ where: { id: membership.guildId } });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      if (membership.role === "LEADER") {
        const nextLeaderId = selectNextLeader(
          otherMembers.map((member) => ({ userId: member.userId, role: member.role, joinedAt: member.joinedAt })),
        );
        if (nextLeaderId) {
          await tx.guildMembership.update({ where: { userId: nextLeaderId }, data: { role: "LEADER" } });
        }
      }
      await tx.guildMembership.delete({ where: { userId } });
    });
  }

  async kickMember(actorUserId: string, targetUserId: string): Promise<void> {
    const { actor, target } = await this.getSameGuildPair(actorUserId, targetUserId);
    if (!canKick(actor.role, target.role)) {
      throw new ForbiddenException("Nemas dozvolu da izbacis ovog clana");
    }
    await this.prisma.guildMembership.delete({ where: { userId: targetUserId } });
    this.notificationsService
      .sendToUser(targetUserId, {
        title: "Izbacen si iz ceha",
        body: "Vise nisi clan ovog ceha.",
        data: { screen: "/guild" },
      })
      .catch(() => undefined);
  }

  async changeMemberRole(actorUserId: string, targetUserId: string, dto: ChangeGuildMemberRoleRequest): Promise<void> {
    const { actor, target } = await this.getSameGuildPair(actorUserId, targetUserId);
    if (!canChangeRole(actor.role)) {
      throw new ForbiddenException("Samo vodja ceha moze da menja uloge");
    }
    if (target.role === "LEADER") {
      throw new BadRequestException("Uloga vodje se menja iskljucivo napustanjem ceha");
    }
    await this.prisma.guildMembership.update({ where: { userId: targetUserId }, data: { role: dto.role } });
  }

  async listGuilds(): Promise<GuildSummaryDto[]> {
    const guilds = await this.prisma.guild.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { totalXp: "desc" },
      take: 50,
    });
    return guilds.map((guild) => ({
      id: guild.id,
      name: guild.name,
      tag: guild.tag,
      level: calculateLevel(guild.totalXp),
      memberCount: guild._count.members,
    }));
  }

  // -- Guild Progression + Quests & Raids --------------------------------

  async getGuildDetail(userId: string): Promise<GuildDetailDto> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }

    const now = new Date();
    const raid = await this.getOrGenerateRaidDto(membership.guildId, now);

    const [guild, members] = await Promise.all([
      this.prisma.guild.findUniqueOrThrow({ where: { id: membership.guildId } }),
      this.prisma.guildMembership.findMany({
        where: { guildId: membership.guildId },
        include: { user: { include: { profile: true } } },
        orderBy: { joinedAt: "asc" },
      }),
    ]);

    const level = calculateLevel(guild.totalXp);
    return {
      id: guild.id,
      name: guild.name,
      tag: guild.tag,
      description: guild.description,
      level,
      totalXp: guild.totalXp,
      currentLevelXp: calculateCurrentLevelXP(guild.totalXp),
      requiredXp: calculateRequiredXP(level),
      progress: calculateProgress(guild.totalXp),
      treasuryCoins: guild.treasuryCoins,
      myRole: membership.role,
      members: members.map(toMemberDto),
      raid,
    };
  }

  /**
   * Poziva se iz WorkoutsService.completeSession (ista transakcija) - ako
   * korisnik nije u cehu, nema efekta. Doprinos je deo total_xp koji je
   * korisnik upravo osvojio (calculateGuildXpContribution), a raid progres
   * se racuna prebrojavanjem zavrsenih treninga SVIH clanova ove ISO
   * nedelje (izvedeno, ne perzistirano - isti princip kao Boss Quest).
   */
  async contributeWorkoutXp(
    userId: string,
    xpGained: number,
    now: Date,
    db: Db,
  ): Promise<{ guildXpContributed: number; guildRaidCompleted: boolean }> {
    const membership = await db.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      return { guildXpContributed: 0, guildRaidCompleted: false };
    }

    const guildXpContributed = calculateGuildXpContribution(xpGained);
    if (guildXpContributed > 0) {
      await db.guild.update({ where: { id: membership.guildId }, data: { totalXp: { increment: guildXpContributed } } });
    }

    const raid = await this.generateRaid(membership.guildId, now, db);
    let guildRaidCompleted = false;
    if (raid.status === "AVAILABLE") {
      const progress = await this.countGuildContributionsThisWeek(membership.guildId, now, db);
      if (isGuildRaidComplete(progress, raid.targetContributions)) {
        const completed = await this.completeRaidIfPending(raid.id, db);
        guildRaidCompleted = completed !== null;
        if (guildRaidCompleted) {
          await db.guild.update({ where: { id: membership.guildId }, data: { treasuryCoins: { increment: raid.coinReward } } });
        }
      }
    }

    return { guildXpContributed, guildRaidCompleted };
  }

  /**
   * Poziva se iz WorkoutsService.completeSession POSLE glavne transakcije
   * (nikad unutar nje - mrezni poziv ka Expo push servisu ne sme da drzi
   * DB transakciju otvorenu). Cita svez guild sastav (van tx) da obavesti
   * SVE clanove, ne samo korisnika cijim je treningom raid zavrsen.
   */
  async sendRaidCompletionNotification(userId: string): Promise<void> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      return;
    }
    const [guild, members] = await Promise.all([
      this.prisma.guild.findUnique({ where: { id: membership.guildId }, select: { name: true } }),
      this.prisma.guildMembership.findMany({ where: { guildId: membership.guildId }, select: { userId: true } }),
    ]);
    await this.notificationsService.sendToUsers(
      members.map((member) => member.userId),
      {
        title: "Cehovski raid zavrsen!",
        body: `${guild?.name ?? "Tvoj ceh"} je osvojio nedeljni raid - riznica je nagradjena.`,
        data: { screen: "/guild" },
      },
    );
  }

  // -- Social & Chat ------------------------------------------------------

  async postMessage(userId: string, dto: PostGuildMessageRequest): Promise<GuildMessageDto> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }

    const message = await this.prisma.guildMessage.create({
      data: { guildId: membership.guildId, userId, message: dto.message },
      include: { user: { include: { profile: true } } },
    });
    return {
      id: message.id,
      userId: message.userId,
      username: message.user.profile?.username ?? "?",
      message: message.message,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async getMessages(userId: string): Promise<GuildMessageDto[]> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }

    const messages = await this.prisma.guildMessage.findMany({
      where: { guildId: membership.guildId },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return messages.reverse().map((message) => ({
      id: message.id,
      userId: message.userId,
      username: message.user.profile?.username ?? "?",
      message: message.message,
      createdAt: message.createdAt.toISOString(),
    }));
  }

  // -- Treasury & Rewards ---------------------------------------------------

  async donateToGuild(userId: string, dto: DonateToGuildRequest): Promise<GuildDetailDto> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (!membership) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }

    await this.prisma.$transaction(async (tx) => {
      const progression = await tx.progression.findUniqueOrThrow({ where: { userId } });
      if (progression.coins < dto.coins) {
        throw new BadRequestException("Nemas dovoljno novcica");
      }
      await tx.progression.update({ where: { userId }, data: { coins: { decrement: dto.coins } } });
      await tx.guild.update({ where: { id: membership.guildId }, data: { treasuryCoins: { increment: dto.coins } } });
    });

    return this.getGuildDetail(userId);
  }

  /**
   * Samo vodja - deli riznicu ravnopravno svim clanovima (uklj. sebe).
   * Ostatak od celobrojnog deljenja ostaje u riznici (vidi
   * @risesolo/domain guild/treasury.ts) umesto da ide bilo kome pojedinacno.
   */
  async distributeGuildTreasury(actorUserId: string): Promise<GuildDetailDto> {
    const membership = await this.prisma.guildMembership.findUnique({ where: { userId: actorUserId } });
    if (!membership) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }
    if (!canDistributeTreasury(membership.role)) {
      throw new ForbiddenException("Samo vodja ceha moze da deli riznicu");
    }

    await this.prisma.$transaction(async (tx) => {
      const guild = await tx.guild.findUniqueOrThrow({ where: { id: membership.guildId } });
      const members = await tx.guildMembership.findMany({ where: { guildId: guild.id } });
      const { perMember, remainder } = distributeTreasury(guild.treasuryCoins, members.length);

      if (perMember > 0) {
        await tx.progression.updateMany({
          where: { userId: { in: members.map((member) => member.userId) } },
          data: { coins: { increment: perMember } },
        });
      }
      await tx.guild.update({ where: { id: guild.id }, data: { treasuryCoins: remainder } });
    });

    return this.getGuildDetail(actorUserId);
  }

  // -- Interni helperi ------------------------------------------------------

  private async assertNotInGuild(userId: string): Promise<void> {
    const existing = await this.prisma.guildMembership.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException("Vec si clan nekog ceha");
    }
  }

  private async getSameGuildPair(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ actor: GuildMembership; target: GuildMembership }> {
    const [actor, target] = await Promise.all([
      this.prisma.guildMembership.findUnique({ where: { userId: actorUserId } }),
      this.prisma.guildMembership.findUnique({ where: { userId: targetUserId } }),
    ]);
    if (!actor) {
      throw new NotFoundException("Nisi clan nijednog ceha");
    }
    if (!target || target.guildId !== actor.guildId) {
      throw new NotFoundException("Taj korisnik nije clan tvog ceha");
    }
    return { actor, target };
  }

  private async getOrGenerateRaidDto(guildId: string, now: Date): Promise<GuildRaidDto> {
    const raid = await this.generateRaid(guildId, now, this.prisma);
    const progress = await this.countGuildContributionsThisWeek(guildId, now, this.prisma);
    return toRaidDto(raid, progress);
  }

  /** Idempotentno preko @@unique([guildId, weekStart]) - isti princip kao Quest.date. */
  private async generateRaid(guildId: string, now: Date, db: Db): Promise<GuildRaid> {
    const weekStart = startOfIsoWeek(now);
    const existing = await db.guildRaid.findUnique({ where: { guildId_weekStart: { guildId, weekStart } } });
    if (existing) {
      return existing;
    }

    try {
      return await db.guildRaid.create({
        data: {
          guildId,
          weekStart,
          targetContributions: GUILD_RAID_TARGET_CONTRIBUTIONS,
          coinReward: GUILD_RAID_COIN_REWARD,
          status: "AVAILABLE",
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const race = await db.guildRaid.findUnique({ where: { guildId_weekStart: { guildId, weekStart } } });
        if (race) {
          return race;
        }
      }
      throw error;
    }
  }

  private async countGuildContributionsThisWeek(guildId: string, now: Date, db: Db): Promise<number> {
    const weekStart = startOfIsoWeek(now);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const members = await db.guildMembership.findMany({ where: { guildId }, select: { userId: true } });
    if (members.length === 0) {
      return 0;
    }
    return db.workoutSession.count({
      where: {
        userId: { in: members.map((member) => member.userId) },
        status: "COMPLETED",
        completedAt: { gte: weekStart, lt: weekEnd },
      },
    });
  }

  private async completeRaidIfPending(raidId: string, db: Db): Promise<GuildRaid | null> {
    const raid = await db.guildRaid.findUnique({ where: { id: raidId } });
    if (!raid || raid.status === "COMPLETED" || raid.status === "EXPIRED") {
      return null;
    }
    return db.guildRaid.update({ where: { id: raidId }, data: { status: "COMPLETED", completedAt: new Date() } });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2002";
}

function toMemberDto(member: MembershipWithUsername): GuildMemberDto {
  return {
    userId: member.userId,
    username: member.user.profile?.username ?? "?",
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  };
}

function toRaidDto(raid: GuildRaid, progress: number): GuildRaidDto {
  return {
    id: raid.id,
    weekStart: raid.weekStart.toISOString().slice(0, 10),
    targetContributions: raid.targetContributions,
    progress: Math.min(progress, raid.targetContributions),
    coinReward: raid.coinReward,
    status: raid.status,
  };
}
