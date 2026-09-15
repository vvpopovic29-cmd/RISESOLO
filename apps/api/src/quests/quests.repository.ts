import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { questInsertSchema, questRowSchema, type QuestInsert, type QuestRow } from "@risesolo/validation";
import { SupabaseService } from "../supabase/supabase.service";

/** Postgres unique_violation (npr. unique(user_id, date) na quests). */
const POSTGRES_UNIQUE_VIOLATION = "23505";

export class QuestConflictError extends Error {}

@Injectable()
export class QuestsRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findByUserAndDate(userId: string, date: string): Promise<QuestRow | null> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("quests")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(`Neuspesno citanje quest-a: ${error.message}`);
    }
    return data ? questRowSchema.parse(data) : null;
  }

  /**
   * Ubacuje NOV quest (generateDailyQuest je deterministicka - id je uvek
   * `daily-{userId}-{date}`). Ako je neko drugi paralelno vec ubacio isti
   * red (unique(user_id, date) ili PK), baca QuestConflictError - caller
   * (QuestsService) tada treba da ponovo procita postojeci red umesto da
   * pokusa da ga prepise.
   */
  async insert(row: QuestInsert): Promise<QuestRow> {
    const payload = questInsertSchema.parse(row);
    const { data, error } = await this.supabaseService
      .getClient()
      .from("quests")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new QuestConflictError(error.message);
      }
      throw new InternalServerErrorException(`Neuspesno kreiranje quest-a: ${error.message}`);
    }
    return questRowSchema.parse(data);
  }

  async update(
    id: string,
    updates: { progress_value: number; status: string; completed_at: string | null },
  ): Promise<QuestRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("quests")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      throw new InternalServerErrorException(`Neuspesno azuriranje quest-a: ${error?.message}`);
    }
    return questRowSchema.parse(data);
  }
}
