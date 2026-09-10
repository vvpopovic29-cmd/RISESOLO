import { Injectable } from "@nestjs/common";
import type { PlayerGameState } from "@risesolo/domain";

export const PLAYER_REPOSITORY = Symbol("PLAYER_REPOSITORY");

export interface PlayerRepository {
  findByUserId(userId: string): Promise<PlayerGameState | undefined>;
  save(userId: string, state: PlayerGameState): Promise<void>;
}

/**
 * In-memory implementacija (Faza 2 jos nema Prisma/PostgreSQL konekciju -
 * videti "Poznata ogranicenja" u root README-u).
 */
@Injectable()
export class InMemoryPlayerRepository implements PlayerRepository {
  private readonly statesByUserId = new Map<string, PlayerGameState>();

  async findByUserId(userId: string): Promise<PlayerGameState | undefined> {
    return this.statesByUserId.get(userId);
  }

  async save(userId: string, state: PlayerGameState): Promise<void> {
    this.statesByUserId.set(userId, state);
  }
}
