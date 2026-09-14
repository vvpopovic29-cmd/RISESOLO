-- Faza 3 (Quest sistem) - jedan red po (user_id, date), tacno prati
-- DailyQuest tip iz packages/domain/src/quests/quest.types.ts. Katalog
-- sablona (QUEST_DEFINITIONS) NAMERNO ostaje u kodu (packages/domain),
-- ne u bazi - generateDailyQuest je deterministicka funkcija koda, ova
-- tabela cuva samo rezultujuce instance.
--
-- Korisnik NEMA direktan INSERT/UPDATE/DELETE - progress/status/
-- completion racuna i upisuje SAMO backend (Completion Engine, Faza 6),
-- nikad klijent direktno ("Quest se ne sme zavrsiti samo zato sto
-- frontend posalje completed=true").

create table public.quests (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  definition_id text not null,
  title text not null,
  description text not null,
  target_value integer not null check (target_value > 0),
  unit text not null,
  progress_value integer not null default 0 check (progress_value >= 0),
  status text not null default 'AVAILABLE'
    check (status in ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
  reward_xp integer not null check (reward_xp >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz null,
  unique (user_id, date)
);
comment on table public.quests is 'Faza 3 Daily Quest instance. id je deterministicki (daily-{user_id}-{date}) iz generateDailyQuest() - unique(user_id, date) je dodatna zastita od duplikata.';

alter table public.quests enable row level security;

create policy quests_select_own on public.quests
  for select to authenticated
  using (user_id = auth.uid());

create index idx_quests_user_date on public.quests (user_id, date desc);
