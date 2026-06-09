import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resetPageUiState } from '@/contexts/ConfirmContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Logo } from '@/components/Logo';

export function Login() {
  const { session, profile, signIn, loading } = useAuth();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    resetPageUiState();
    const t = window.setTimeout(() => emailRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, []);

  if (!loading && session && profile) {
    return <Navigate to={profile.role === 'coach' ? '/coach' : '/joueur'} replace />;
  }

  const profileMissing = !loading && session && !profile;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(
        err?.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : err?.message ?? 'Connexion impossible.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-bg relative h-dvh overflow-x-hidden overflow-y-auto touch-pan-y">
      {/* Halos décoratifs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />

      <div className="relative flex min-h-full items-center justify-center p-4 py-8">
      <div className="w-full max-w-md animate-fade-up">
        <div className="card card-top-accent overflow-hidden">
          <div className="relative flex flex-col items-center px-8 pb-8 pt-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(250,204,21,0.16),_transparent_70%)]" />
            <Logo className="h-28 w-auto drop-shadow-[0_0_28px_rgba(250,204,21,0.4)]" />
            <h1 className="mt-4 text-2xl font-bold">
              <span className="text-gold">FCA</span>{' '}
              <span className="text-white">Fiche Joueur</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Espace du club — connectez-vous pour continuer
            </p>
          </div>

          <div className="px-8 pb-8">
            {!isSupabaseConfigured && (
              <div className="mb-4 rounded-xl border border-brand-400/30 bg-brand-400/10 px-3 py-2 text-sm text-brand-300">
                Configuration Supabase manquante. Renseignez le fichier <code>.env</code>.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {profileMissing && (
                <div className="rounded-xl border border-amber-900/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
                  Session active mais profil introuvable. Déconnectez-vous et reconnectez-vous,
                  ou contactez l&apos;administrateur du club.
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  className="input"
                  placeholder="vous@club.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-zinc-500">
              Pas encore de compte ?{' '}
              <Link to="/signup" className="link-accent font-medium">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} FCA — Tous droits réservés
        </p>
      </div>
      </div>
    </div>
  );
}
