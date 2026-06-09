-- =============================================================
-- Migration : un joueur → plusieurs équipes (fiche unique)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =============================================================

-- Table de liaison joueur ↔ équipes
create table if not exists public.player_teams (
  player_id uuid not null references public.players (id) on delete cascade,
  team_id   uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, team_id)
);

create index if not exists idx_player_teams_player on public.player_teams (player_id);
create index if not exists idx_player_teams_team on public.player_teams (team_id);

-- Migrer les anciennes données (players.team_id)
insert into public.player_teams (player_id, team_id)
select id, team_id
from public.players
where team_id is not null
on conflict do nothing;

-- RPC mise à jour : rejoindre une équipe (crée la fiche si besoin)
create or replace function public.join_team_by_code(
  p_code   text,
  p_nom    text default null,
  p_prenom text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile   profiles%rowtype;
  v_team      teams%rowtype;
  v_player_id uuid;
  v_nom       text;
  v_prenom    text;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Non authentifié';
  end if;
  if v_profile.role <> 'joueur' then
    raise exception 'Seuls les joueurs peuvent rejoindre une équipe';
  end if;

  select * into v_team
  from public.teams
  where upper(trim(code)) = upper(trim(p_code));

  if v_team.id is null then
    raise exception 'Code équipe invalide';
  end if;

  select id into v_player_id
  from public.players
  where lower(email) = lower(v_profile.email)
  limit 1;

  if v_player_id is not null then
    if exists (
      select 1 from public.player_teams
      where player_id = v_player_id and team_id = v_team.id
    ) then
      raise exception 'Vous êtes déjà dans cette équipe';
    end if;

    if exists (
      select 1 from public.players
      where id = v_player_id and coach_id <> v_team.coach_id
    ) then
      raise exception 'Votre fiche est liée à un autre coach';
    end if;

    insert into public.player_teams (player_id, team_id)
    values (v_player_id, v_team.id);

    return v_player_id;
  end if;

  v_nom := coalesce(nullif(trim(p_nom), ''), split_part(v_profile.email, '@', 1));
  v_prenom := coalesce(nullif(trim(p_prenom), ''), 'Joueur');

  insert into public.players (coach_id, nom, prenom, email)
  values (v_team.coach_id, v_nom, v_prenom, v_profile.email)
  returning id into v_player_id;

  insert into public.player_teams (player_id, team_id)
  values (v_player_id, v_team.id);

  return v_player_id;
end;
$$;

grant execute on function public.join_team_by_code(text, text, text) to authenticated;

-- RLS player_teams
alter table public.player_teams enable row level security;

drop policy if exists "player_teams_select" on public.player_teams;
drop policy if exists "player_teams_insert" on public.player_teams;
drop policy if exists "player_teams_delete" on public.player_teams;

create policy "player_teams_select" on public.player_teams for select
  using (
    public.is_coach_of_player(player_id)
    or public.is_own_player(player_id)
  );

create policy "player_teams_insert" on public.player_teams for insert
  with check (
    public.current_role() = 'coach'
    and public.is_coach_of_player(player_id)
    and exists (
      select 1 from public.teams t
      where t.id = team_id and t.coach_id = auth.uid()
    )
  );

create policy "player_teams_delete" on public.player_teams for delete
  using (public.is_coach_of_player(player_id));

-- Policy équipes : joueur voit toutes ses équipes
drop policy if exists "teams_select_player" on public.teams;
create policy "teams_select_player" on public.teams for select
  using (
    exists (
      select 1
      from public.player_teams pt
      join public.players p on p.id = pt.player_id
      join public.profiles pr on pr.id = auth.uid()
      where pt.team_id = teams.id
        and pr.role = 'joueur'
        and p.email is not null
        and lower(p.email) = lower(pr.email)
    )
  );

-- Optionnel : supprimer l'ancienne colonne (une seule équipe)
alter table public.players drop column if exists team_id;

drop index if exists public.idx_players_team_id;
