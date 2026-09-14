-- Faza 2 (Database) - profiles / player_stats / progression / xp_events,
-- tacno prema odlukama zakljucanim u packages/domain (Faza 1):
--   total_xp je source of truth; level i rank su DERIVED (racunaju se u
--   apps/api iz calculateLevel/calculateRank, NISU kolone ovde - da ne bi
--   doslo do drift-a kao u primeru iz README-a: total_xp=5000, level
--   ostao 6 zbog buga).
-- Sve senzitivne mutacije (XP, coins, stat points, streak) idu SAMO kroz
-- service_role (apps/api backend) - authenticated korisnik nema INSERT/
-- UPDATE/DELETE na ovim tabelama, samo SELECT sopstvenog reda. To je
-- direktna primena "server je jedini autoritet" principa iz Faze 6.

create extension if not exists pgcrypto;

create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 24),
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Jedan red po korisniku (Faza 2). Prosiruje auth.users - id je isti kao auth.users.id.';

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- player_stats (Faza 1 - STAT RULES: STARTING_STAT_VALUE = 5)
-- ---------------------------------------------------------------------
create table public.player_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  strength integer not null default 5 check (strength >= 0),
  agility integer not null default 5 check (agility >= 0),
  endurance integer not null default 5 check (endurance >= 0),
  vitality integer not null default 5 check (vitality >= 0),
  intelligence integer not null default 5 check (intelligence >= 0),
  unspent_points integer not null default 0 check (unspent_points >= 0),
  updated_at timestamptz not null default now()
);
comment on table public.player_stats is 'STR/AGI/END/VIT/INT (Faza 1). Mutira se SAMO preko backend allocate-stat-points endpointa (allocateStatPoints domain funkcija) - nema direktnog klijentskog UPDATE-a.';

alter table public.player_stats enable row level security;

create policy player_stats_select_own on public.player_stats
  for select to authenticated
  using (user_id = auth.uid());

create trigger trg_player_stats_set_updated_at
  before update on public.player_stats
  for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- progression (total_xp source of truth; coins + streak takodje ovde)
-- ---------------------------------------------------------------------
create table public.progression (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date null,
  updated_at timestamptz not null default now()
);
comment on table public.progression is 'total_xp je source of truth (Faza 1) - level/rank se NE cuvaju ovde, racunaju se u apps/api iz calculateLevel/calculateRank(total_xp). coins/streak su minimalni preview (Faza 8/9).';

alter table public.progression enable row level security;

create policy progression_select_own on public.progression
  for select to authenticated
  using (user_id = auth.uid());

create trigger trg_progression_set_updated_at
  before update on public.progression
  for each row execute function public.fn_set_updated_at();

-- ---------------------------------------------------------------------
-- xp_events (Faza 1 - XP Transactions, idempotency preko unique constraint)
-- ---------------------------------------------------------------------
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('WORKOUT', 'QUEST')),
  source_id text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);
comment on table public.xp_events is 'Isti (user_id, source, source_id) ne moze dati XP dvaput - unique constraint sprecava duplo slanje istog Completion Engine rezultata (Faza 1/6).';

alter table public.xp_events enable row level security;

create policy xp_events_select_own on public.xp_events
  for select to authenticated
  using (user_id = auth.uid());

create index idx_xp_events_user_id on public.xp_events (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Signup: kreiraj profiles/player_stats/progression red za svakog novog
-- auth.users korisnika. username je privremen (korisnik ga bira u
-- onboardingu, Faza 10) - "hunter_" + prvih 8 karaktera user id-ja,
-- garantovano jedinstven.
-- ---------------------------------------------------------------------
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
    values (new.id, 'hunter_' || substr(new.id::text, 1, 8));
  insert into public.player_stats (user_id) values (new.id);
  insert into public.progression (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.fn_handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();
