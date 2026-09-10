-- Faza 3: prosireni Exercise Database - difficulty, uputstvo za izvodjenje,
-- i alternativne vezbe (kada oprema nije dostupna).

alter table public.exercises
  add column difficulty text check (difficulty is null or difficulty in ('E', 'D', 'C', 'B', 'A', 'S')),
  add column instructions text;

create table public.exercise_alternatives (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises (id) on delete cascade,
  primary key (exercise_id, alternative_exercise_id),
  check (exercise_id <> alternative_exercise_id)
);

create index exercise_alternatives_alternative_idx on public.exercise_alternatives (alternative_exercise_id);

alter table public.exercise_alternatives enable row level security;

create policy exercise_alternatives_select_all on public.exercise_alternatives
  for select to authenticated, anon
  using (true);

update public.exercises set difficulty = 'C',
  instructions = 'Stopala u sirini ramena, spusti kukove unazad i nadole drzeci ledja ravnim, zatim se eksplozivno vrati u pocetni polozaj.'
  where name = 'Squat';
update public.exercises set difficulty = 'C',
  instructions = 'Lezi na klupu, spusti sipku do grudi kontrolisano, zatim je potisni pravo nagore.'
  where name = 'Bench Press';
update public.exercises set difficulty = 'B',
  instructions = 'Kukovi iza sipke, drzi ledja ravnim, podigni sipku vukom kroz pete do potpunog ispravljanja kukova.'
  where name = 'Deadlift';
update public.exercises set difficulty = 'C',
  instructions = 'Sipka na visini ramena, potisni je pravo iznad glave drzeci core napet.'
  where name = 'Overhead Press';
update public.exercises set difficulty = 'C',
  instructions = 'Nadhvat sirine ramena, povuci telo nagore dok brada ne predje sipku.'
  where name = 'Pull Up';
update public.exercises set difficulty = 'C',
  instructions = 'Blago savijena kolena, spusti sipku niz noge drzeci ledja ravnim, oseti istezanje zadnje loze.'
  where name = 'Romanian Deadlift';
update public.exercises set difficulty = 'C',
  instructions = 'Zadnja noga na povisenju, spusti se dok prednji but ne bude paralelan sa podom.'
  where name = 'Bulgarian Split Squat';
update public.exercises set difficulty = 'D',
  instructions = 'Stopala u sirini ramena na platformi, spusti tezinu kontrolisano do 90 stepeni u kolenu.'
  where name = 'Leg Press';
update public.exercises set difficulty = 'E',
  instructions = 'Ruke malo sire od ramena, spusti grudi ka podu drzeci telo pravo, zatim se potisni nagore.'
  where name = 'Push Up';
update public.exercises set difficulty = 'D',
  instructions = 'Blago nagnut trup, povuci uteg ka kuku drzeci lakat blizu tela.'
  where name = 'Dumbbell Row';

insert into public.exercise_alternatives (exercise_id, alternative_exercise_id)
select b.id, p.id from public.exercises b, public.exercises p where b.name = 'Bench Press' and p.name = 'Push Up'
union all
select s.id, bss.id from public.exercises s, public.exercises bss where s.name = 'Squat' and bss.name = 'Bulgarian Split Squat'
union all
select s.id, lp.id from public.exercises s, public.exercises lp where s.name = 'Squat' and lp.name = 'Leg Press'
union all
select pu.id, dr.id from public.exercises pu, public.exercises dr where pu.name = 'Pull Up' and dr.name = 'Dumbbell Row'
on conflict do nothing;
