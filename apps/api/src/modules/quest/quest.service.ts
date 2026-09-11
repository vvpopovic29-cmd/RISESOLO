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
const WEEKLY_WORKOUT_QUEST_TARGET = 5;
const WEEKLY_WORKOUT_QUEST_XP_REWARD = 2000;
const WEEKLY_WORKOUT_QUEST_COIN_REWARD = 150;
const SIDE_NUTRITION_QUEST_TARGET = 3;
const SIDE_NUTRITION_QUEST_XP_REWARD = 200;
const SIDE_NUTRITION_QUEST_COIN_REWARD = 15;

@Injectable()
export class QuestService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async listQuests(playerId: string, status?: QuestStatus): Promise<QuestResponse[]> {
    await this.expireStaleQuests(playerId);

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
   * pravi System AI generator questova ne implementira.
   */
  async generateDailyQuest(playerId: string): Promise<QuestResponse> {
    await this.expireStaleQuests(playerId);
    const { todayStart, tomorrowStart } = getUtcDayWindow(new Date());

    const existing = await this.findActiveQuestCreatedInWindow(
      playerId,
      "daily",
      "workout",
      todayStart,
      tomorrowStart,
    );
    if (existing) {
      return mapQuestRowToResponse(existing);
    }

    const created = await this.insertQuest({
      player_id: playerId,
      type: "daily",
      title: "Zavrsi danasnji trening",
      description: "Zavrsi bar jedan trening danas da dobijes nagradu i produzis streak.",
      linked_action: "workout",
      target_count: 1,
      xp_reward: DAILY_WORKOUT_QUEST_XP_REWARD,
      coin_reward: DAILY_WORKOUT_QUEST_COIN_REWARD,
      expires_at: tomorrowStart.toISOString(),
    });

    return mapQuestRowToResponse(created);
  }

  /**
   * Vraca ovonedeljni Weekly Quest (kreira ga ako jos ne postoji).
   * Idempotentno po ISO nedelji (ponedeljak 00:00 UTC do sledeceg
   * ponedeljka) - vise treninga tokom nedelje progresuju isti quest
   * preko istog `linked_action = 'workout'` mehanizma kao Daily Quest
   * (fn_log_workout ne razlikuje daily/weekly, samo trazi sve aktivne
   * questove sa tim linked_action-om).
   */
  async generateWeeklyQuest(playerId: string): Promise<QuestResponse> {
    await this.expireStaleQuests(playerId);
    const { weekStart, weekEnd } = getUtcWeekWindow(new Date());

    const existing = await this.findActiveQuestCreatedInWindow(
      playerId,
      "weekly",
      "workout",
      weekStart,
      weekEnd,
    );
    if (existing) {
      return mapQuestRowToResponse(existing);
    }

    const created = await this.insertQuest({
      player_id: playerId,
      type: "weekly",
      title: `Zavrsi ${WEEKLY_WORKOUT_QUEST_TARGET} treninga ove nedelje`,
      description: `Zabelezi ${WEEKLY_WORKOUT_QUEST_TARGET} treninga do kraja nedelje za veliku nagradu.`,
      linked_action: "workout",
      target_count: WEEKLY_WORKOUT_QUEST_TARGET,
      xp_reward: WEEKLY_WORKOUT_QUEST_XP_REWARD,
      coin_reward: WEEKLY_WORKOUT_QUEST_COIN_REWARD,
      expires_at: weekEnd.toISOString(),
    });

    return mapQuestRowToResponse(created);
  }

  /**
   * Vraca danasnji Side Quest (Nutrition-fokusiran, kreira ga ako jos ne
   * postoji). Idempotentno po kalendarskom danu, isti obrazac kao Daily
   * Quest. Progresuje se preko `linked_action = 'nutrition'` u
   * fn_log_meal.
   */
  async generateSideQuest(playerId: string): Promise<QuestResponse> {
    await this.expireStaleQuests(playerId);
    const { todayStart, tomorrowStart } = getUtcDayWindow(new Date());

    const existing = await this.findActiveQuestCreatedInWindow(
      playerId,
      "side",
      "nutrition",
      todayStart,
      tomorrowStart,
    );
    if (existing) {
      return mapQuestRowToResponse(existing);
    }

    const created = await this.insertQuest({
      player_id: playerId,
      type: "side",
      title: `Zabelezi ${SIDE_NUTRITION_QUEST_TARGET} obroka danas`,
      description: "Prati svoju ishranu tokom celog dana za dodatnu nagradu.",
      linked_action: "nutrition",
      target_count: SIDE_NUTRITION_QUEST_TARGET,
      xp_reward: SIDE_NUTRITION_QUEST_XP_REWARD,
      coin_reward: SIDE_NUTRITION_QUEST_COIN_REWARD,
      expires_at: tomorrowStart.toISOString(),
    });

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

  /** Best-effort sweep - oznacava aktivne questove igraca cije je expires_at proslo kao 'expired'. */
  private async expireStaleQuests(playerId: string): Promise<void> {
    const { error } = await this.supabase.rpc("fn_expire_stale_quests", {
      p_player_id: playerId,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Provera isteklih questova nije uspela: ${error.message}`,
      );
    }
  }

  private async findActiveQuestCreatedInWindow(
    playerId: string,
    type: QuestRow["type"],
    linkedAction: NonNullable<QuestRow["linked_action"]>,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<QuestRow | null> {
    const { data, error } = await this.supabase
      .from("quests")
      .select("*")
      .eq("player_id", playerId)
      .eq("type", type)
      .eq("linked_action", linkedAction)
      .eq("status", "active")
      .gte("created_at", windowStart.toISOString())
      .lt("created_at", windowEnd.toISOString())
      .maybeSingle<QuestRow>();

    if (error) {
      throw new InternalServerErrorException(
        `Provera postojeceg questa nije uspela: ${error.message}`,
      );
    }

    return data;
  }

  private async insertQuest(row: {
    player_id: string;
    type: QuestRow["type"];
    title: string;
    description: string;
    linked_action: NonNullable<QuestRow["linked_action"]>;
    target_count: number;
    xp_reward: number;
    coin_reward: number;
    expires_at: string;
  }): Promise<QuestRow> {
    const { data, error } = await this.supabase
      .from("quests")
      .insert(row)
      .select("*")
      .single<QuestRow>();

    if (error || !data) {
      throw new InternalServerErrorException(
        `Kreiranje questa nije uspelo: ${error?.message ?? "nepoznata greska"}`,
      );
    }

    return data;
  }
}

function getUtcDayWindow(now: Date): { todayStart: Date; tomorrowStart: Date } {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  return { todayStart, tomorrowStart };
}

/** Nedelja pocinje ponedeljkom 00:00 UTC (ISO 8601), zavrsava sledeceg ponedeljka 00:00 UTC. */
function getUtcWeekWindow(now: Date): { weekStart: Date; weekEnd: Date } {
  const { todayStart } = getUtcDayWindow(now);
  const dayOfWeek = todayStart.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const weekStart = new Date(todayStart.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { weekStart, weekEnd };
}
