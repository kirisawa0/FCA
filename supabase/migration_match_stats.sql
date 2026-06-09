-- =============================================================
-- Stats de match rugby par joueur
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =============================================================

create table if not exists public.player_match_stats (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players (id) on delete cascade,
  coach_id            uuid not null references public.profiles (id) on delete cascade,
  team_id             uuid references public.teams (id) on delete set null,
  match_date          date not null default current_date,
  adversaire          text,
  essais              int not null default 0 check (essais >= 0),
  transformations     int not null default 0 check (transformations >= 0),
  penalites           int not null default 0 check (penalites >= 0),
  drops               int not null default 0 check (drops >= 0),
  plaquages_reussis   int not null default 0 check (plaquages_reussis >= 0),
  plaquages_manques   int not null default 0 check (plaquages_manques >= 0),
  passes              int not null default 0 check (passes >= 0),
  metres_parcourus    int not null default 0 check (metres_parcourus >= 0),
  ballons_portes      int not null default 0 check (ballons_portes >= 0),
  minutes_jouees      int not null default 0 check (minutes_jouees >= 0 and minutes_jouees <= 120),
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_match_stats_player   on public.player_match_stats (player_id);
create index if not exists idx_match_stats_coach    on public.player_match_stats (coach_id);
create index if not exists idx_match_stats_team     on public.player_match_stats (team_id);
create index if not exists idx_match_stats_date     on public.player_match_stats (match_date desc);

comment on table public.player_match_stats is 'Statistiques rugby par match et par joueur';

alter table public.player_match_stats enable row level security;

create policy "match_stats_select" on public.player_match_stats for select
  using (
    coach_id = auth.uid()
    or public.is_own_player(player_id)
  );

create policy "match_stats_insert" on public.player_match_stats for insert
  with check (
    coach_id = auth.uid()
    and public.current_role() = 'coach'
    and public.is_coach_of_player(player_id)
  );

create policy "match_stats_update" on public.player_match_stats for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "match_stats_delete" on public.player_match_stats for delete
  using (coach_id = auth.uid());
