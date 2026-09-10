import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestResponse, QuestStatus } from "@risesolo/validation";
import { SUPABASE_CLIENT } from "../../supabase/supabase.module";
import { mapQuestRowToResponse } from "./quest.mapper";
import type { QuestRow } from "./quest.types";

const DAILY_WORKOUT_QUEST_XP_REWARD = 500;
const DAILY_WORKOUT_QUEST_COIN_REWARD = 20;

@Injectable()
export class QuestService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listQuests(playerId: string, status?: QuestStatus): Promise<QuestResponse[]> {
    let query = this.supabase
      .from("quests")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.returns<QuestRow[]>();

    if (error) {
      throw new InternalServerErrorException(`Ucitavanje questova nije uspelo: ${error.message}`);
    }

    return (data ?? []).map(mapQuestRowToResponse);
  }

  /**
   * Vraca danasnji Daily Quest (kreira ga ako jos ne postoji). Idempotentno
   * po kalendarskom danu (UTC) - vise poziva u istom danu vracaju isti
   * quest umesto da naprave duplikat. Sadrzaj questa je fiksan na
   * backendu (nagrade nisu konfigurabilne od strane klijenta) dok se
   * pravi System AI generator questova (Faza 4) ne implementira.
   */
  async generateDailyQuest(playerId: string): Promise<QuestResponse> {
    const { todayStart, tomorrowStart } = getUtcDayWindow(new Date());

    const { data: existing, error: findError } = await this.supabase
      .from("quests")
      .select("*")
      .eq("player_id", playerId)
      .eq("type", "daily")
      .eq("linked_action", "workout")
      .eq("status", "active")
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", tomorrowStart.toISOString())
      .maybeSingle<QuestRow>();

    if (findError) {
      throw new InternalServerErrorException(
        `Provera dnevnog questa nije uspela: ${findError.message}`,
      );
    }
    if (existing) {
      return mapQuestRowToResponse(existing);
    }

    const { data: created, error: insertError } = await this.supabase
      .from("quests")
      .insert({
        player_id: playerId,
        type: "daily",
        title: "Zavrsi danasnji trening",
        description: "Zavrsi bar jedan trening danas da dobijes nagradu i produzis streak.",
        linked_action: "workout",
        target_count: 1,
        xp_reward: DAILY_WORKOUT_QUEST_XP_REWARD,
        coin_reward: DAILY_WORKOUT_QUEST_COIN_REWARD,
        expires_at: tomorrowStart.toISOString(),
      })
      .select("*")
      .single<QuestRow>();

    if (insertError || !created) {
      throw new InternalServerErrorException(
        `Kreiranje dnevnog questa nije uspelo: ${insertError?.message ?? "nepoznata greska"}`,
      );
    }

    return mapQuestRowToResponse(created);
  }

  async completeQuest(playerId: string, questId: string): Promise<QuestResponse> {
    const { data, error } = await this.supabase.rpc("fn_complete_daily_quest", {
      p_player_id: playerId,
      p_quest_id: questId,
    });

    if (error) {
      // fn_complete_daily_quest baca "quest % not found for player %" kada
      // quest ne postoji ili ne pripada pozivaocu - to mapiramo na 404;
      // sve ostalo (npr. progres jos nije dostigao cilj) je 400.
      if (error.message.includes("not found")) {
        throw new NotFoundException("Quest ne postoji");
      }
      throw new BadRequestException(`Zavrsavanje questa nije uspelo: ${error.message}`);
    }

    return mapQuestRowToResponse(data as QuestRow);
  }
}

function getUtcDayWindow(now: Date): { todayStart: Date; tomorrowStart: Date } {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { todayStart, tomorrowStart };
}
