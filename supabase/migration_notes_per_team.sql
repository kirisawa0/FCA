-- =============================================================
-- Notes et évaluations liées à une équipe précise
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =============================================================

alter table public.player_notes
  add column if not exists team_id uuid references public.teams (id) on delete set null;

alter table public.player_stat_evaluations
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists idx_player_notes_team on public.player_notes (team_id);
create index if not exists idx_player_stat_evaluations_team on public.player_stat_evaluations (team_id);

comment on column public.player_notes.team_id is 'Équipe concernée par la note du coach';
comment on column public.player_stat_evaluations.team_id is 'Équipe concernée par l''évaluation';
