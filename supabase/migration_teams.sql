-- =============================================================
-- Migration : équipes + inscription joueurs par code
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =============================================================

-- Table équipes
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  code       text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.teams is 'Équipes créées par les coaches, avec code d''invitation';

-- Lien joueur ↔ équipe
alter table public.players
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists idx_teams_coach_id on public.teams (coach_id);
create index if not exists idx_teams_code on public.teams (code);
create index if not exists idx_players_team_id on public.players (team_id);

-- Génération code unique (ex: FCA-A3K9X2)
create or replace function public.generate_team_code()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i      int;
begin
  loop
    result := 'FCA-';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.teams where code = result);
  end loop;
  return result;
end;
$$;

create or replace function public.set_team_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null or trim(new.code) = '' then
    new.code := public.generate_team_code();
  else
    new.code := upper(trim(new.code));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teams_code on public.teams;
create trigger trg_teams_code
  before insert on public.teams
  for each row execute function public.set_team_code();

-- Trigger : coach_id de l'équipe doit être un coach
create or replace function public.check_team_coach_role()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.coach_id and role = 'coach'
  ) then
    raise exception 'coach_id doit référencer un profil avec le rôle coach';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_teams_coach_role on public.teams;
create trigger trg_teams_coach_role
  before insert or update on public.teams
  for each row execute function public.check_team_coach_role();

-- RPC : un joueur rejoint une équipe via son code
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
  v_profile profiles%rowtype;
  v_team    teams%rowtype;
  v_player_id uuid;
  v_nom     text;
  v_prenom  text;
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

  if exists (
    select 1 from public.players
    where lower(email) = lower(v_profile.email)
  ) then
    raise exception 'Vous avez déjà une fiche joueur';
  end if;

  v_nom := coalesce(nullif(trim(p_nom), ''), split_part(v_profile.email, '@', 1));
  v_prenom := coalesce(nullif(trim(p_prenom), ''), 'Joueur');

  insert into public.players (coach_id, team_id, nom, prenom, email)
  values (v_team.coach_id, v_team.id, v_nom, v_prenom, v_profile.email)
  returning id into v_player_id;

  return v_player_id;
end;
$$;

grant execute on function public.join_team_by_code(text, text, text) to authenticated;

-- RLS équipes
alter table public.teams enable row level security;

drop policy if exists "teams_select_coach" on public.teams;
drop policy if exists "teams_select_player" on public.teams;
drop policy if exists "teams_insert" on public.teams;
drop policy if exists "teams_update" on public.teams;
drop policy if exists "teams_delete" on public.teams;

create policy "teams_select_coach" on public.teams for select
  using (coach_id = auth.uid());

create policy "teams_select_player" on public.teams for select
  using (
    exists (
      select 1
      from public.players p
      join public.profiles pr on pr.id = auth.uid()
      where p.team_id = teams.id
        and pr.role = 'joueur'
        and p.email is not null
        and lower(p.email) = lower(pr.email)
    )
  );

create policy "teams_insert" on public.teams for insert
  with check (coach_id = auth.uid() and public.current_role() = 'coach');

create policy "teams_update" on public.teams for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "teams_delete" on public.teams for delete
  using (coach_id = auth.uid());
