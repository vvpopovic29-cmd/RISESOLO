-- Fixes Supabase performance advisor finding: player_achievements.achievement_id
-- (foreign key to achievements.id) had no covering index - only the composite
-- primary key (player_id, achievement_id) existed, which doesn't help queries/
-- cascade deletes filtering by achievement_id alone.
create index player_achievements_achievement_id_idx
  on public.player_achievements (achievement_id);
