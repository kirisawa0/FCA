-- =============================================================

-- Migration : système de statistiques (v2)

-- À exécuter dans Supabase Dashboard > SQL Editor > Run

-- Corrige : "Could not find the table 'public.player_stat_categories'"

-- =============================================================



-- Ancienne table (v1)

drop table if exists public.player_stats cascade;



-- Tables v2

create table if not exists public.player_stat_categories (

  id         uuid primary key default gen_random_uuid(),

  player_id  uuid not null references public.players (id) on delete cascade,

  label      text not null,

  sort_order int not null default 0,

  created_at timestamptz not null default now(),

  unique (player_id, label)

);



create table if not exists public.player_stat_evaluations (

  id                   uuid primary key default gen_random_uuid(),

  player_id            uuid not null references public.players (id) on delete cascade,

  coach_id             uuid not null references public.profiles (id) on delete cascade,

  note_globale         numeric(4, 2) not null check (note_globale between 0 and 10),

  note_globale_ajustee numeric(4, 2) check (note_globale_ajustee between 0 and 10),

  commentaire          text,

  created_at           timestamptz not null default now()

);



create table if not exists public.player_stat_values (

  id            uuid primary key default gen_random_uuid(),

  evaluation_id uuid not null references public.player_stat_evaluations (id) on delete cascade,

  category_id   uuid not null references public.player_stat_categories (id) on delete cascade,

  valeur        numeric(3, 1) not null check (valeur between 0 and 10),

  unique (evaluation_id, category_id)

);



create index if not exists idx_stat_categories_player on public.player_stat_categories (player_id);

create index if not exists idx_stat_evaluations_player on public.player_stat_evaluations (player_id);

create index if not exists idx_stat_values_evaluation on public.player_stat_values (evaluation_id);



-- RLS

alter table public.player_stat_categories   enable row level security;

alter table public.player_stat_evaluations enable row level security;

alter table public.player_stat_values      enable row level security;



-- Politiques (ré-exécutable)

drop policy if exists "stat_categories_select" on public.player_stat_categories;

drop policy if exists "stat_categories_insert" on public.player_stat_categories;

drop policy if exists "stat_categories_delete" on public.player_stat_categories;

drop policy if exists "stat_evaluations_select" on public.player_stat_evaluations;

drop policy if exists "stat_evaluations_insert" on public.player_stat_evaluations;

drop policy if exists "stat_evaluations_delete" on public.player_stat_evaluations;

drop policy if exists "stat_values_select" on public.player_stat_values;

drop policy if exists "stat_values_insert" on public.player_stat_values;



create policy "stat_categories_select" on public.player_stat_categories for select

  using (public.is_coach_of_player(player_id) or public.is_own_player(player_id));

create policy "stat_categories_insert" on public.player_stat_categories for insert

  with check (public.current_role() = 'coach' and public.is_coach_of_player(player_id));

create policy "stat_categories_delete" on public.player_stat_categories for delete

  using (public.is_coach_of_player(player_id));



create policy "stat_evaluations_select" on public.player_stat_evaluations for select

  using (public.is_coach_of_player(player_id) or public.is_own_player(player_id));

create policy "stat_evaluations_insert" on public.player_stat_evaluations for insert

  with check (public.current_role() = 'coach' and public.is_coach_of_player(player_id));

create policy "stat_evaluations_delete" on public.player_stat_evaluations for delete

  using (public.is_coach_of_player(player_id));



create policy "stat_values_select" on public.player_stat_values for select

  using (

    exists (

      select 1 from public.player_stat_evaluations e

      where e.id = player_stat_values.evaluation_id

        and (public.is_coach_of_player(e.player_id) or public.is_own_player(e.player_id))

    )

  );

create policy "stat_values_insert" on public.player_stat_values for insert

  with check (

    public.current_role() = 'coach'

    and exists (

      select 1 from public.player_stat_evaluations e

      where e.id = player_stat_values.evaluation_id

        and public.is_coach_of_player(e.player_id)

    )

  );



-- Stats par défaut pour les joueurs existants

insert into public.player_stat_categories (player_id, label, sort_order)

select p.id, cat.label, cat.sort_order

from public.players p

cross join (

  values

    ('Technique', 1),

    ('Physique', 2),

    ('Affectif', 3),

    ('Mentales', 4),

    ('Perceptif Décisionnel', 5)

) as cat(label, sort_order)

where not exists (

  select 1 from public.player_stat_categories c where c.player_id = p.id

);



-- Vérification

select 'player_stat_categories' as table_name, count(*) as lignes from public.player_stat_categories

union all

select 'player_stat_evaluations', count(*) from public.player_stat_evaluations

union all

select 'player_stat_values', count(*) from public.player_stat_values;

