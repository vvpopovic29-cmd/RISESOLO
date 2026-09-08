import { Injectable } from "@nestjs/common";
import type { PlayerProfile as PrismaPlayerProfile } from "@prisma/client";
import type { PlayerGameState } from "@risesolo/domain";
import { PrismaService } from "../prisma/prisma.service";
import type { PlayerRepository } from "./player.repository";

function toState(row: PrismaPlayerProfile): PlayerGameState {
  return {
    totalXp: row.totalXp,
    gold: row.gold,
    unallocatedStatPoints: row.unallocatedStatPoints,
    stats: {
      strength: row.strength,
      agility: row.agility,
      endurance: row.endurance,
      vitality: row.vitality,
    },
  };
}

@Injectable()
export class PrismaPlayerRepository implements PlayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PlayerGameState | undefined> {
    const row = await this.prisma.playerProfile.findUnique({ where: { userId } });
    return row ? toState(row) : undefined;
  }

  async save(userId: string, state: PlayerGameState): Promise<void> {
    const columns = {
      totalXp: state.totalXp,
      gold: state.gold,
      unallocatedStatPoints: state.unallocatedStatPoints,
      strength: state.stats.strength,
      agility: state.stats.agility,
      endurance: state.stats.endurance,
      vitality: state.stats.vitality,
    };

    await this.prisma.playerProfile.upsert({
      where: { userId },
      create: { userId, ...columns },
      update: columns,
    });
  }
}
