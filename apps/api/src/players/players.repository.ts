import { Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import {
  playerStatsRowSchema,
  profileRowSchema,
  progressionRowSchema,
  type PlayerStatsRow,
  type ProfileRow,
  type ProgressionRow,
} from "@risesolo/validation";
import { SupabaseService } from "../supabase/supabase.service";

/**
 * Jedini sloj koji zna za `profiles`/`player_stats`/`progression` tabele.
 * Vraca validirane (Zod) redove - PlayersService ih mapira u domain/
 * response oblik.
 */
@Injectable()
export class PlayersRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(userId: string): Promise<ProfileRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Profil za korisnika ${userId} nije pronadjen`);
    }
    return profileRowSchema.parse(data);
  }

  async getPlayerStats(userId: string): Promise<PlayerStatsRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("player_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`player_stats za korisnika ${userId} nije pronadjen`);
    }
    return playerStatsRowSchema.parse(data);
  }

  async getProgression(userId: string): Promise<ProgressionRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("progression")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`progression za korisnika ${userId} nije pronadjen`);
    }
    return progressionRowSchema.parse(data);
  }

  /**
   * Upisuje NOVE vrednosti statova (posle allocateStatPoints domain poziva).
   * Ovo je jedino mesto koje pise u player_stats - poziva se SAMO iz
   * PlayersService, nikad direktno iz kontrolera.
   */
  async updatePlayerStats(
    userId: string,
    updates: {
      strength: number;
      agility: number;
      endurance: number;
      vitality: number;
      intelligence: number;
      unspent_points: number;
    },
  ): Promise<PlayerStatsRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("player_stats")
      .update(updates)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `Neuspesno azuriranje player_stats za korisnika ${userId}: ${error?.message}`,
      );
    }
    return playerStatsRowSchema.parse(data);
  }

  /** Upisuje novo stanje progression reda - poziva se SAMO iz Completion Engine-a (Faza 6). */
  async updateProgression(
    userId: string,
    updates: {
      total_xp: number;
      coins: number;
      current_streak: number;
      longest_streak: number;
      last_activity_date: string | null;
    },
  ): Promise<ProgressionRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("progression")
      .update(updates)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(
        `Neuspesno azuriranje progression za korisnika ${userId}: ${error?.message}`,
      );
    }
    return progressionRowSchema.parse(data);
  }
}
