import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  supabase,
  login,
  logout,
  signUp as authSignUp,
  getProfile,
  getSession,
  getCurrentUser,
} from '@/lib/supabase';
import type { Profile, SignUpInput } from '@/types';
import { ensurePlayerJoined } from '@/services/teams';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isCoach: boolean;
  isJoueur: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const p = await getProfile();
      setProfile(p);
      if (p?.role === 'joueur') {
        try {
          const user = await getCurrentUser();
          await ensurePlayerJoined(p.email, user?.user_metadata);
        } catch (err) {
          console.error('Liaison équipe joueur:', err);
        }
      }
    } catch (err) {
      console.error('Erreur de chargement du profil:', err);
      setProfile(null);
    }
  }

  useEffect(() => {
    let active = true;

    getSession().then(async (s) => {
      if (!active) return;
      setSession(s);
      if (s?.user) await loadProfile();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile();
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const s = await login(email, password);
    setSession(s);

    const p = await getProfile();
    if (!p) {
      await logout();
      setSession(null);
      setProfile(null);
      throw new Error(
        'Votre compte n’est pas encore configuré. Contactez l’administrateur du club ou recréez votre compte.'
      );
    }
    setProfile(p);

    if (p.role === 'joueur') {
      try {
        const user = await getCurrentUser();
        await ensurePlayerJoined(p.email, user?.user_metadata);
      } catch (err) {
        console.error('Liaison équipe joueur:', err);
      }
    }
  }

  async function signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }> {
    const data = await authSignUp(input);

    if (!data.session) {
      return { needsEmailConfirmation: true };
    }

    setSession(data.session);

    const p = await getProfile();
    if (!p) {
      await logout();
      setSession(null);
      setProfile(null);
      throw new Error('Profil introuvable après inscription.');
    }
    setProfile(p);

    if (input.role === 'joueur') {
      const user = await getCurrentUser();
      await ensurePlayerJoined(p.email, user?.user_metadata, {
        team_code: input.teamCode,
        nom: input.nom,
        prenom: input.prenom,
      });
    }

    return { needsEmailConfirmation: false };
  }

  async function signOut() {
    await logout();
    setSession(null);
    setProfile(null);
  }

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile: loadProfile,
    isCoach: profile?.role === 'coach',
    isJoueur: profile?.role === 'joueur',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
