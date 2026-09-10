import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  INITIAL_PLAYER_STATE,
  allocateStatPoint,
  applyRewards,
  assertNever,
  type GameEngineError,
  type PlayerGameState,
  type QuestRewards,
  type RewardOutcome,
  type StatKey,
} from "@risesolo/domain";
import type { PlayerProfileResponse } from "@risesolo/validation";
import { toPlayerProfileResponse } from "./player.mapper";
import { PLAYER_REPOSITORY, type PlayerRepository } from "./player.repository";

function describeGameEngineError(error: GameEngineError): string {
  switch (error.type) {
    case "invalid_reward":
      return "Nagrada mora biti nenegativan ceo broj";
    case "invalid_points":
      return "Broj poena mora biti pozitivan ceo broj";
    case "insufficient_stat_points":
      return `Nedovoljno neraspodeljenih poena (raspolozivo: ${error.available}, trazeno: ${error.requested})`;
    default:
      return assertNever(error);
  }
}

@Injectable()
export class PlayerService {
  constructor(@Inject(PLAYER_REPOSITORY) private readonly playerRepository: PlayerRepository) {}

  async createInitialProfile(userId: string): Promise<void> {
    await this.playerRepository.save(userId, INITIAL_PLAYER_STATE);
  }

  async getProfile(userId: string): Promise<PlayerProfileResponse> {
    const state = await this.requireState(userId);
    return toPlayerProfileResponse(userId, state);
  }

  async allocateStat(
    userId: string,
    stat: StatKey,
    points: number,
  ): Promise<PlayerProfileResponse> {
    const state = await this.requireState(userId);
    const result = allocateStatPoint(state, stat, points);
    if (!result.ok) {
      throw new BadRequestException(describeGameEngineError(result.error));
    }

    await this.playerRepository.save(userId, result.value);
    return toPlayerProfileResponse(userId, result.value);
  }

  /**
   * Koristi QuestsService nakon uspesnog zavrsetka questa - namerno nije
   * izlozeno kao samostalna HTTP ruta (game engine nagrade ne sme direktno
   * da dodeljuje klijent).
   */
  async applyRewards(userId: string, reward: QuestRewards): Promise<RewardOutcome> {
    const state = await this.requireState(userId);
    const result = applyRewards(state, reward);
    if (!result.ok) {
      throw new BadRequestException(describeGameEngineError(result.error));
    }

    await this.playerRepository.save(userId, result.value.state);
    return result.value;
  }

  private async requireState(userId: string): Promise<PlayerGameState> {
    const state = await this.playerRepository.findByUserId(userId);
    if (!state) {
      throw new NotFoundException("Profil igraca nije pronadjen");
    }
    return state;
  }
}
