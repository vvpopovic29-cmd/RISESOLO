import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  allocateStatPoints,
  calculateCurrentLevelXP,
  calculateLevel,
  calculateProgress,
  calculateRank,
  calculateRequiredXP,
  type PlayerStats,
} from "@risesolo/domain";
import type {
  AllocateStatPointsRequest,
  OnboardProfileRequest,
  PlayerStateDto,
} from "@risesolo/validation";
import { PrismaService } from "../prisma/prisma.service";
import { QuestsService } from "../quests/quests.service";

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questsService: QuestsService,
  ) {}

  /**
   * `userId` dolazi ISKLJUCIVO iz JWT-a (CurrentUser decorator), nikad iz
   * URL parametra - ovo je nas ownership-guard ekvivalent Supabase RLS-a:
   * korisnik strukturno ne moze da zatrazi tudje stanje.
   *
   * Penalty System se proverava ovde (lazy, isti princip kao generisanje
   * dnevnog/boss questa - nema cron/scheduler u MVP-u): ako je neki DAILY
   * quest ostao nezavrsen iz proslog dana, ovde se to primeti i kaznjava
   * PRE citanja progression-a, tako da vraceno stanje vec odrazava kaznu.
   */
  async getPlayerState(userId: string): Promise<PlayerStateDto> {
    const penalty = await this.prisma.$transaction((tx) =>
      this.questsService.expirePastDueDailyQuests(userId, new Date(), tx),
    );

    const [profile, progression, stats] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.progression.findUnique({ where: { userId } }),
      this.prisma.playerStats.findUnique({ where: { userId } }),
    ]);

    if (!profile || !progression || !stats) {
      throw new NotFoundException("Profil igraca nije pronadjen");
    }

    const level = calculateLevel(progression.totalXp);

    return {
      profile: {
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg ? Number(profile.weightKg) : null,
        trainingType: profile.trainingType,
        experienceLevel: profile.experienceLevel,
        onboarded: profile.onboardedAt !== null,
      },
      progression: {
        totalXp: progression.totalXp,
        level,
        currentLevelXp: calculateCurrentLevelXP(progression.totalXp),
        requiredXp: calculateRequiredXP(level),
        progress: calculateProgress(progression.totalXp),
        rank: calculateRank(level),
        coins: progression.coins,
        currentStreak: progression.currentStreak,
      },
      stats: {
        strength: stats.strength,
        agility: stats.agility,
        endurance: stats.endurance,
        vitality: stats.vitality,
        intelligence: stats.intelligence,
        statPoints: stats.statPoints,
      },
      penalty,
    };
  }

  async onboardProfile(userId: string, dto: OnboardProfileRequest): Promise<PlayerStateDto> {
    const existing = await this.prisma.profile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundException("Profil igraca nije pronadjen");
    }

    if (dto.username !== existing.username) {
      const usernameTaken = await this.prisma.profile.findUnique({ where: { username: dto.username } });
      if (usernameTaken) {
        throw new ConflictException("Korisnicko ime je zauzeto");
      }
    }

    await this.prisma.profile.update({
      where: { userId },
      data: {
        username: dto.username,
        age: dto.age ?? null,
        heightCm: dto.heightCm ?? null,
        weightKg: dto.weightKg ?? null,
        trainingType: dto.trainingType ?? null,
        experienceLevel: dto.experienceLevel ?? null,
        onboardedAt: new Date(),
      },
    });

    return this.getPlayerState(userId);
  }

  async allocateStatPoints(userId: string, allocation: AllocateStatPointsRequest): Promise<PlayerStateDto> {
    const stats = await this.prisma.playerStats.findUnique({ where: { userId } });
    if (!stats) {
      throw new NotFoundException("Statovi igraca nisu pronadjeni");
    }

    const currentStats: PlayerStats = {
      strength: stats.strength,
      agility: stats.agility,
      endurance: stats.endurance,
      vitality: stats.vitality,
      intelligence: stats.intelligence,
    };

    const result = allocateStatPoints(currentStats, stats.statPoints, allocation);
    if (!result.ok) {
      throw new BadRequestException(`Raspodela poena nije validna: ${JSON.stringify(result.error)}`);
    }

    await this.prisma.playerStats.update({
      where: { userId },
      data: { ...result.value.stats, statPoints: result.value.remainingPoints },
    });

    return this.getPlayerState(userId);
  }
}
