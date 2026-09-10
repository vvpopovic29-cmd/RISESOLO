import type { PlayerClass, PlayerRank } from "@risesolo/validation";

/**
 * Oblik `public.players` reda kako ga vraca Supabase (snake_case kolone).
 * Rucno odrzavano ogledalo `players` tabele - videti
 * supabase/migrations/..._gamification_core_schema.sql. Generisanje
 * pravih tipova (`supabase gen types`) je odlozeno dok broj tabela to ne
 * opravda (videti README "Poznata ograničenja").
 */
export interface PlayerRow {
  id: string;
  display_name: string;
  level: number;
  xp: number;
  stat_points_available: number;
  rank: PlayerRank;
  class: PlayerClass | null;
  coins: number;
  hp: number;
  strength: number;
  agility: number;
  endurance: number;
  vitality: number;
  intelligence: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}
