import type { PlayerRank, QuestLinkedAction, QuestStatus, QuestType } from "@risesolo/validation";

/**
 * Oblik `public.quests` reda kako ga vraca Supabase (snake_case kolone).
 * Videti supabase/migrations/..._gamification_core_schema.sql.
 */
export interface QuestRow {
  id: string;
  player_id: string;
  type: QuestType;
  title: string;
  description: string | null;
  linked_action: QuestLinkedAction | null;
  target_count: number;
  progress_count: number;
  xp_reward: number;
  coin_reward: number;
  status: QuestStatus;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  target_rank: PlayerRank | null;
}
