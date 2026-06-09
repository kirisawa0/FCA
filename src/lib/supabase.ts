import {
  createClient,
  type Session,
  type User,
} from '@supabase/supabase-js';
import type { Profile, UserRole, SignUpInput } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Configuration Supabase manquante. Copiez .env.example vers .env et renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
  );
}

/** Client Supabase singleton */
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Connexion par email et mot de passe */
export async function login(
  email: string,
  password: string
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.session) throw new Error('Session introuvable après connexion.');
  return data.session;
}

/** Inscription avec rôle (coach | joueur) */
export async function signUp(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        role: input.role,
        nom: input.nom?.trim() ?? null,
        prenom: input.prenom?.trim() ?? null,
        team_code: input.teamCode?.trim().toUpperCase() ?? null,
      },
    },
  });
  if (error) throw error;
  return data;
}

/** Déconnexion */
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Récupère l'utilisateur Auth actuellement connecté */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/** Récupère la session active */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/** Récupère le profil complet de l'utilisateur connecté */
export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const fullSelect = 'id, email, role, nom, prenom, date_naissance, telephone, bio';
  const { data, error } = await supabase
    .from('profiles')
    .select(fullSelect)
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('column') || msg.includes('schema cache')) {
      const { data: basic, error: basicError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', user.id)
        .maybeSingle();
      if (basicError) throw basicError;
      return basic as Profile | null;
    }
    throw error;
  }
  return data as Profile | null;
}

/** Récupère le rôle de l'utilisateur connecté (coach | joueur) */
export async function getRole(): Promise<UserRole | null> {
  const profile = await getProfile();
  return profile?.role ?? null;
}
