-- =============================================================
--  FCA Fiche Joueur — Schéma Supabase complet
--  À exécuter dans : Supabase Dashboard > SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 0. Nettoyage (optionnel — supprime l'ancien schéma si présent)
-- -------------------------------------------------------------
drop table if exists public.player_stat_values cascade;
drop table if exists public.player_stat_evaluations cascade;
drop table if exists public.player_stat_categories cascade;
drop table if exists public.player_stats cascade;
drop table if exists public.player_notes cascade;
drop table if exists public.player_teams cascade;
drop table if exists public.players cascade;
drop table if exists public.teams cascade;
drop table if exists public.profiles cascade;

drop type if exists public.user_role cascade;

-- -------------------------------------------------------------
-- 1. Type énuméré pour les rôles
-- -------------------------------------------------------------
create type public.user_role as enum ('coach', 'joueur');

-- -------------------------------------------------------------
-- 2. Table profiles
--    Liée à auth.users (un profil par compte)
-- -------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null unique,
  role            public.user_role not null default 'joueur',
  nom             text,
  prenom          text,
  date_naissance  date,
  telephone       text,
  bio             text
);

comment on table public.profiles is 'Profils utilisateurs avec rôle coach ou joueur';

-- -------------------------------------------------------------
-- 3. Table teams
--    Équipes créées par un coach (code d'invitation auto-généré)
-- -------------------------------------------------------------
create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  code       text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.teams is 'Équipes du club avec code d''invitation pour les joueurs';

-- -------------------------------------------------------------
-- 4. Table players
--    coach_id → le coach propriétaire de la fiche
--    email    → permet au joueur de consulter sa fiche
--               (doit correspondre à l''email de son compte)
-- -------------------------------------------------------------
create table public.players (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null references public.profiles (id) on delete cascade,
  nom            text not null,
  prenom         text not null,
  date_naissance date,
  poste          text,
  telephone      text,
  email          text
);

comment on table public.players is 'Fiches joueurs gérées par un coach';

-- -------------------------------------------------------------
-- 4b. Table player_teams (joueur ↔ plusieurs équipes)
-- -------------------------------------------------------------
create table public.player_teams (
  player_id  uuid not null references public.players (id) on delete cascade,
  team_id    uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, team_id)
);

comment on table public.player_teams is 'Appartenance d''un joueur à une ou plusieurs équipes';

-- -------------------------------------------------------------
-- 5. Table player_notes
--    Notes / commentaires du coach sur un joueur
-- -------------------------------------------------------------
create table public.player_notes (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players (id) on delete cascade,
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  team_id    uuid references public.teams (id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now()
);

comment on table public.player_notes is 'Commentaires du coach sur un joueur';

-- -------------------------------------------------------------
-- 5. Statistiques — catégories personnalisables par joueur
-- -------------------------------------------------------------
create table public.player_stat_categories (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players (id) on delete cascade,
  label      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, label)
);

-- Évaluations (saisies datées)
create table public.player_stat_evaluations (
  id                   uuid primary key default gen_random_uuid(),
  player_id            uuid not null references public.players (id) on delete cascade,
  coach_id             uuid not null references public.profiles (id) on delete cascade,
  team_id              uuid references public.teams (id) on delete set null,
  note_globale         numeric(4, 2) not null check (note_globale between 0 and 10),
  note_globale_ajustee numeric(4, 2) check (note_globale_ajustee between 0 and 10),
  commentaire          text,
  created_at           timestamptz not null default now()
);

-- Notes par catégorie
create table public.player_stat_values (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.player_stat_evaluations (id) on delete cascade,
  category_id   uuid not null references public.player_stat_categories (id) on delete cascade,
  valeur        numeric(3, 1) not null check (valeur between 0 and 10),
  unique (evaluation_id, category_id)
);

comment on table public.player_stat_categories is 'Critères d''évaluation personnalisables (Technique, Physique, etc.)';
comment on table public.player_stat_evaluations is 'Évaluations datées avec note globale sur 10';
comment on table public.player_stat_values is 'Note sur 10 par critère pour chaque évaluation';

-- -------------------------------------------------------------
-- 6. Index
-- -------------------------------------------------------------
create index idx_teams_coach_id         on public.teams (coach_id);
create index idx_teams_code             on public.teams (code);
create index idx_players_coach_id       on public.players (coach_id);
create index idx_player_teams_player    on public.player_teams (player_id);
create index idx_player_teams_team      on public.player_teams (team_id);
create index idx_players_email         on public.players (email);
create index idx_player_notes_player   on public.player_notes (player_id);
create index idx_player_notes_coach    on public.player_notes (coach_id);
create index idx_player_notes_team     on public.player_notes (team_id);
create index idx_stat_categories_player  on public.player_stat_categories (player_id);
create index idx_stat_evaluations_player on public.player_stat_evaluations (player_id);
create index idx_stat_evaluations_team   on public.player_stat_evaluations (team_id);
create index idx_stat_values_evaluation  on public.player_stat_values (evaluation_id);

-- -------------------------------------------------------------
-- 7. Trigger : coach_id doit être un profil « coach »
-- -------------------------------------------------------------
create or replace function public.check_coach_role()
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

create trigger trg_players_coach_role
  before insert or update on public.players
  for each row execute function public.check_coach_role();

create trigger trg_player_notes_coach_role
  before insert or update on public.player_notes
  for each row execute function public.check_coach_role();

-- -------------------------------------------------------------
-- 7b. Équipes — code auto-généré + validation coach
-- -------------------------------------------------------------
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

create trigger trg_teams_code
  before insert on public.teams
  for each row execute function public.set_team_code();

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

create trigger trg_teams_coach_role
  before insert or update on public.teams
  for each row execute function public.check_team_coach_role();

-- RPC : joueur rejoint une équipe via code (fiche unique, plusieurs équipes)
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

-- -------------------------------------------------------------
-- 8. Trigger : création automatique du profil à l'inscription
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce(
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    'joueur'::public.user_role
  );

  insert into public.profiles (id, email, role)
  values (new.id, new.email, v_role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- 9. Fonctions helpers pour les politiques RLS
-- -------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Le joueur connecté est-il propriétaire de cette fiche ?
-- (liaison via l'email du compte = email de la fiche)
create or replace function public.is_own_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.players pl
    join public.profiles pr on pr.id = auth.uid()
    where pl.id = p_player_id
      and pr.role = 'joueur'
      and pl.email is not null
      and lower(pl.email) = lower(pr.email)
  );
$$;

-- Le coach connecté est-il propriétaire de cette fiche ?
create or replace function public.is_coach_of_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.players
    where id = p_player_id
      and coach_id = auth.uid()
  );
$$;

-- Vérifie si l'email d'une fiche joueur a un compte (profiles)
create or replace function public.check_player_accounts(p_player_ids uuid[])
returns table(player_id uuid, has_account boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id as player_id,
    exists (
      select 1
      from public.profiles pr
      where p.email is not null
        and lower(pr.email) = lower(p.email)
    ) as has_account
  from public.players p
  where p.id = any(p_player_ids)
    and p.coach_id = auth.uid();
end;
$$;

grant execute on function public.check_player_accounts(uuid[]) to authenticated;

-- -------------------------------------------------------------
-- 10. Row Level Security
-- -------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.players      enable row level security;
alter table public.player_teams enable row level security;
alter table public.player_notes enable row level security;
alter table public.player_stat_categories   enable row level security;
alter table public.player_stat_evaluations enable row level security;
alter table public.player_stat_values      enable row level security;

-- ===================== PROFILES =====================

-- Chaque utilisateur lit son propre profil
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

-- Chaque utilisateur met à jour son propre profil
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===================== TEAMS =====================

create policy "teams_select_coach" on public.teams for select
  using (coach_id = auth.uid());

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

create policy "teams_insert" on public.teams for insert
  with check (coach_id = auth.uid() and public.current_role() = 'coach');

create policy "teams_update" on public.teams for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "teams_delete" on public.teams for delete
  using (coach_id = auth.uid());

-- ===================== PLAYER_TEAMS =====================

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

-- ===================== PLAYERS =====================

-- Coach : voit uniquement ses joueurs
-- Joueur : voit uniquement sa propre fiche (email correspondant)
create policy "players_select"
  on public.players for select
  using (
    coach_id = auth.uid()
    or public.is_own_player(id)
  );

-- Seul un coach peut créer un joueur (pour lui-même)
create policy "players_insert"
  on public.players for insert
  with check (
    coach_id = auth.uid()
    and public.current_role() = 'coach'
  );

-- Un coach modifie uniquement ses joueurs
create policy "players_update"
  on public.players for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Un coach supprime uniquement ses joueurs
create policy "players_delete"
  on public.players for delete
  using (coach_id = auth.uid());

-- ===================== PLAYER_NOTES =====================

-- Lecture : coach propriétaire OU joueur concerné
create policy "player_notes_select"
  on public.player_notes for select
  using (
    coach_id = auth.uid()
    or public.is_own_player(player_id)
  );

-- Écriture : coach propriétaire du joueur uniquement
create policy "player_notes_insert"
  on public.player_notes for insert
  with check (
    coach_id = auth.uid()
    and public.current_role() = 'coach'
    and public.is_coach_of_player(player_id)
  );

create policy "player_notes_update"
  on public.player_notes for update
  using (coach_id = auth.uid())
  with check (
    coach_id = auth.uid()
    and public.is_coach_of_player(player_id)
  );

create policy "player_notes_delete"
  on public.player_notes for delete
  using (coach_id = auth.uid());

-- ===================== STATISTIQUES =====================

alter table public.player_stat_categories   enable row level security;
alter table public.player_stat_evaluations enable row level security;
alter table public.player_stat_values      enable row level security;

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
