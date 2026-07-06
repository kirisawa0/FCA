import { supabase } from '@/lib/supabase';
import type { CoachProfileInput, Profile } from '@/types';

const profileSelect =
  'id, email, role, nom, prenom, date_naissance, telephone, bio';

export async function updateProfile(input: CoachProfileInput): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Non authentifié.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      nom: input.nom.trim(),
      prenom: input.prenom.trim(),
      date_naissance: input.date_naissance || null,
      telephone: input.telephone?.trim() || null,
      bio: input.bio?.trim() || null,
    })
    .eq('id', user.id)
    .select(profileSelect)
    .single();

  if (error) throw error;
  return data as Profile;
}

/** @deprecated Utiliser updateProfile */
export const updateCoachProfile = updateProfile;

