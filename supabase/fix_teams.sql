-- =============================================================
-- Script de réparation équipes (à exécuter si les équipes
-- ne s'affichent pas ou ne se créent pas)
-- Supabase Dashboard > SQL Editor > Run
-- =============================================================

-- 1) S'assurer que la table teams existe (migration_teams.sql)
create table if not exists public.teams (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  code       text not null unique,
  created_at timestamptz not null default now()
);

-- 2) Fonction + trigger code équipe
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

-- 3) Réparer les équipes sans code valide
do $$
declare
  r record;
  new_code text;
begin
  for r in select id from public.teams where code is null or trim(code) = '' loop
    loop
      new_code := public.generate_team_code();
      exit when not exists (select 1 from public.teams where code = new_code and id <> r.id);
    end loop;
    update public.teams set code = new_code where id = r.id;
  end loop;
end;
$$;

-- 4) RLS teams
alter table public.teams enable row level security;

drop policy if exists "teams_select_coach" on public.teams;
drop policy if exists "teams_select_player" on public.teams;
drop policy if exists "teams_insert" on public.teams;
drop policy if exists "teams_update" on public.teams;
drop policy if exists "teams_delete" on public.teams;

create policy "teams_select_coach" on public.teams for select
  using (coach_id = auth.uid());

create policy "teams_insert" on public.teams for insert
  with check (coach_id = auth.uid() and public.current_role() = 'coach');

create policy "teams_update" on public.teams for update
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "teams_delete" on public.teams for delete
  using (coach_id = auth.uid());

-- 5) Vérification
select id, name, code, coach_id, created_at
from public.teams
order by created_at desc;
