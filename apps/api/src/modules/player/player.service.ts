import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AllocateStatPointsInput,
  PlayerResponse,
  UpdatePlayerProfileInput,
} from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import { mapPlayerRowToResponse } from "./player.mapper";
import type { PlayerRow } from "./player.types";

@Injectable()
export class PlayerService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async getProfile(playerId: string): Promise<PlayerResponse> {
    const { data, error } = await this.supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .maybeSingle<PlayerRow>();

    if (error) {
      throw new InternalServerErrorException(`Ucitavanje igraca nije uspelo: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException("Player profil ne postoji");
    }

    return mapPlayerRowToResponse(data);
  }

  async updateProfile(playerId: string, input: UpdatePlayerProfileInput): Promise<PlayerResponse> {
    const patch: Partial<Pick<PlayerRow, "display_name" | "class">> = {};
    if (input.displayName !== undefined) {
      patch.display_name = input.displayName;
    }
    if (input.class !== undefined) {
      patch.class = input.class;
    }

    const { data, error } = await this.supabase
      .from("players")
      .update(patch)
      .eq("id", playerId)
      .select("*")
      .maybeSingle<PlayerRow>();

    if (error) {
      throw new InternalServerErrorException(`Azuriranje profila nije uspelo: ${error.message}`);
    }
    if (!data) {
      throw new NotFoundException("Player profil ne postoji");
    }

    return mapPlayerRowToResponse(data);
  }

  /**
   * Trosi Stat Points na izabrani atribut. Iskljucivo poziva
   * fn_allocate_stat_points (SECURITY DEFINER RPC) koja atomski proverava
   * da igrac ima dovoljno poena pre nego sto ih potrosi - klijent nikad ne
   * salje novu vrednost stata, samo koliko poena zeli da potrosi.
   */
  async allocateStatPoints(
    playerId: string,
    input: AllocateStatPointsInput,
  ): Promise<PlayerResponse> {
    const { data, error } = await this.supabase.rpc("fn_allocate_stat_points", {
      p_player_id: playerId,
      p_stat: input.stat,
      p_points: input.points,
    });

    if (error) {
      throw new BadRequestException(`Dodela stat poena nije uspela: ${error.message}`);
    }

    return mapPlayerRowToResponse(data as PlayerRow);
  }
}
