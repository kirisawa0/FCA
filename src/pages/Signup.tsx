import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Logo } from '@/components/Logo';
import type { UserRole } from '@/types';

export function Signup() {
  const { session, profile, signUp, loading } = useAuth();
  const [role, setRole] = useState<UserRole>('joueur');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session && profile) {
    return <Navigate to={profile.role === 'coach' ? '/coach' : '/joueur'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (role === 'joueur') {
      if (!nom.trim() || !prenom.trim()) {
        setError('Le nom et le prénom sont obligatoires pour un joueur.');
        return;
      }
      if (!teamCode.trim()) {
        setError('Le code équipe est obligatoire pour rejoindre votre coach.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        email,
        password,
        role,
        nom: role === 'joueur' ? nom : undefined,
        prenom: role === 'joueur' ? prenom : undefined,
        teamCode: role === 'joueur' ? teamCode : undefined,
      });

      if (result.needsEmailConfirmation) {
        setSuccess(
          'Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous. Votre équipe sera liée automatiquement à la première connexion.'
        );
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Inscription impossible.';
      if (msg.includes('already registered')) {
        setError('Cet email est déjà utilisé.');
      } else if (msg.includes('Code équipe invalide')) {
        setError('Code équipe invalide. Demandez le code à votre coach.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-bg relative h-dvh overflow-x-hidden overflow-y-auto touch-pan-y">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />

      <div className="relative flex min-h-full items-start justify-center p-4 py-8 sm:items-center">
      <div className="w-full max-w-md animate-fade-up">
        <div className="card card-top-accent overflow-hidden">
          <div className="relative flex flex-col items-center px-8 pb-6 pt-10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,_rgba(250,204,21,0.16),_transparent_70%)]" />
            <Logo className="h-24 w-auto drop-shadow-[0_0_28px_rgba(250,204,21,0.4)]" />
            <h1 className="mt-4 text-2xl font-bold">
              <span className="text-gold">Créer</span>{' '}
              <span className="text-white">un compte</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Rejoignez le club FCA</p>
          </div>

          <div className="px-8 pb-8">
            {!isSupabaseConfigured && (
              <div className="mb-4 rounded-xl border border-brand-400/30 bg-brand-400/10 px-3 py-2 text-sm text-brand-300">
                Configuration Supabase manquante. Renseignez le fichier <code>.env</code>.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-400">
                  {success}
                  <Link to="/login" className="mt-2 block font-medium text-brand-400 hover:underline">
                    Aller à la connexion →
                  </Link>
                </div>
              )}

              <div>
                <label className="label">Je suis</label>
                <div className="grid grid-cols-2 gap-2">
                  <RoleButton active={role === 'coach'} onClick={() => setRole('coach')}>
                    Coach
                  </RoleButton>
                  <RoleButton active={role === 'joueur'} onClick={() => setRole('joueur')}>
                    Joueur
                  </RoleButton>
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="vous@club.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Mot de passe</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label className="label">Confirmer</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              {role === 'joueur' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Prénom *</label>
                      <input
                        className="input"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Nom *</label>
                      <input
                        className="input"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Code équipe *</label>
                    <input
                      className="input font-mono uppercase tracking-wider"
                      placeholder="FCA-XXXXXX"
                      value={teamCode}
                      onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                      required
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Demandez ce code à votre coach (menu Mon équipe).
                    </p>
                  </div>
                </>
              )}

              {role === 'coach' && (
                <p className="rounded-xl border border-fca-border bg-fca-gray/40 px-3 py-2 text-xs text-zinc-400">
                  Après inscription, créez votre équipe dans le menu{' '}
                  <strong className="text-zinc-300">Mon équipe</strong> pour obtenir
                  le code à partager à vos joueurs.
                </p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={submitting || !!success}>
                {submitting ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-zinc-500">
              Déjà un compte ?{' '}
              <Link to="/login" className="link-accent font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'border-brand-400/50 bg-gold-gradient text-black shadow-gold-sm'
          : 'border-fca-border bg-fca-gray/40 text-zinc-400 hover:border-brand-400/30 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}
