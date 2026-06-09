-- =============================================================
-- Vérifier si un joueur (email sur fiche) a créé son compte
-- =============================================================

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
