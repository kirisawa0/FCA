-- =============================================================
-- Profil personnel du coach (nom, prénom, âge, etc.)
-- À exécuter dans Supabase Dashboard > SQL Editor
-- =============================================================

alter table public.profiles
  add column if not exists nom text,
  add column if not exists prenom text,
  add column if not exists date_naissance date,
  add column if not exists telephone text,
  add column if not exists bio text;

comment on column public.profiles.nom is 'Nom du coach';
comment on column public.profiles.prenom is 'Prénom du coach';
comment on column public.profiles.date_naissance is 'Date de naissance du coach';
comment on column public.profiles.telephone is 'Téléphone du coach';
comment on column public.profiles.bio is 'Présentation courte du coach';
