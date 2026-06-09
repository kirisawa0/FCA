-- =============================================================
-- Réparation : recréer les profils manquants
-- À exécuter si la connexion échoue avec "Profil introuvable"
-- (souvent après avoir relancé schema.sql qui supprime profiles)
-- =============================================================

insert into public.profiles (id, email, role)
select
  u.id,
  u.email,
  coalesce(
    (u.raw_user_meta_data ->> 'role')::public.user_role,
    'joueur'::public.user_role
  )
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Vérification
select u.email, p.role, p.id is not null as profil_ok
from auth.users u
left join public.profiles p on p.id = u.id
order by u.email;
