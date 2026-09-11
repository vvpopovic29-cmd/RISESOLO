import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementResponse } from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import { mapAchievementRowToResponse } from "./achievement.mapper";
import type { AchievementRow, PlayerAchievementRow } from "./achievement.types";

@Injectable()
export class AchievementService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  /** Ceo katalog, spojen sa unlocked/unlockedAt stanjem za trenutnog igraca. */
  async listAchievements(playerId: string): Promise<AchievementResponse[]> {
    const { data: achievements, error } = await this.supabase
      .from("achievements")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<AchievementRow[]>();

    if (error) {
      throw new InternalServerErrorException(
        `Ucitavanje achievement kataloga nije uspelo: ${error.message}`,
      );
    }

    const { data: unlocked, error: unlockedError } = await this.supabase
      .from("player_achievements")
      .select("*")
      .eq("player_id", playerId)
      .returns<PlayerAchievementRow[]>();

    if (unlockedError) {
      throw new InternalServerErrorException(
        `Ucitavanje otkljucanih achievement-a nije uspelo: ${unlockedError.message}`,
      );
    }

    const unlockedAtByAchievementId = new Map(
      (unlocked ?? []).map((row) => [row.achievement_id, row.unlocked_at]),
    );

    return (achievements ?? []).map((row) =>
      mapAchievementRowToResponse(row, unlockedAtByAchievementId.get(row.id) ?? null),
    );
  }

  /**
   * Pokrece fn_evaluate_achievements - proverava trenutne pragove i
   * otkljucava sve nove. Bezbedno je pozivati posle svake aktivnosti koja
   * moze da ispuni neki uslov (workout, obrok, voda, quest); RPC je
   * idempotentna (videti komentar u migraciji).
   */
  async evaluateAchievements(playerId: string): Promise<AchievementResponse[]> {
    const { data, error } = await this.supabase.rpc("fn_evaluate_achievements", {
      p_player_id: playerId,
    });

    if (error) {
      throw new BadRequestException(`Provera achievement-a nije uspela: ${error.message}`);
    }

    const rows = (data ?? []) as AchievementRow[];
    const now = new Date().toISOString();
    return rows.map((row) => mapAchievementRowToResponse(row, now));
  }
}
