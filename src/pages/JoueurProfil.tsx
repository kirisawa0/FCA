import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/profile';
import { listMyPlayers } from '@/services/players';
import type { CoachProfileInput, Team } from '@/types';
import { computeAge, formatDate, fullName } from '@/lib/format';
import { userFriendlyError } from '@/lib/dbErrors';
import { Spinner } from '@/components/ui/Spinner';

function toForm(profile: ReturnType<typeof useAuth>['profile']): CoachProfileInput {
  return {
    nom: profile?.nom ?? '',
    prenom: profile?.prenom ?? '',
    date_naissance: profile?.date_naissance ?? null,
    telephone: profile?.telephone ?? null,
    bio: profile?.bio ?? null,
  };
}

export function JoueurProfil() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<CoachProfileInput>(toForm(profile));
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toForm(profile));
  }, [profile]);

  useEffect(() => {
    if (!profile?.email) return;
    setLoadingTeams(true);
    listMyPlayers(profile.email)
      .then((players) => {
        const seen = new Set<string>();
        const list: Team[] = [];
        for (const p of players) {
          for (const t of p.teams ?? []) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              list.push(t);
            }
          }
        }
        setTeams(list);
      })
      .catch(console.error)
      .finally(() => setLoadingTeams(false));
  }, [profile?.email]);

  const age = computeAge(form.date_naissance);
  const isComplete = Boolean(form.nom.trim() && form.prenom.trim());

  function update<K extends keyof CoachProfileInput>(key: K, value: CoachProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.prenom.trim() || !form.nom.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(form);
      await refreshProfile();
      setSuccess(true);
    } catch (err) {
      setError(userFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">
          Mon <span className="text-gold">profil</span>
        </h1>
        <p className="page-subtitle">
          Complétez vos informations personnelles visibles dans l&apos;application.
        </p>
      </div>

      <div className="card card-top-accent overflow-hidden">
        <div className="relative flex items-center gap-5 bg-gradient-to-r from-fca-black via-fca-surface to-fca-black px-6 py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(250,204,21,0.14),_transparent_60%)]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-gradient text-3xl font-extrabold text-black shadow-gold">
            {(form.prenom[0] ?? profile.email[0] ?? '?').toUpperCase()}
          </div>
          <div className="relative">
            <h2 className="text-2xl font-bold text-white">
              {isComplete ? fullName(form) : 'Profil à compléter'}
            </h2>
            <p className="text-sm text-zinc-400">{profile.email}</p>
            {age != null && (
              <p className="mt-1 text-sm font-medium text-brand-400">{age} ans</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-400">
              Profil enregistré avec succès.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input
                className="input"
                value={form.prenom}
                onChange={(e) => update('prenom', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input
                className="input"
                value={form.nom}
                onChange={(e) => update('nom', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date de naissance</label>
              <input
                type="date"
                className="input"
                value={form.date_naissance ?? ''}
                onChange={(e) => update('date_naissance', e.target.value || null)}
              />
              {form.date_naissance && (
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDate(form.date_naissance)}
                  {age != null ? ` — ${age} ans` : ''}
                </p>
              )}
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                className="input"
                placeholder="06 12 34 56 78"
                value={form.telephone ?? ''}
                onChange={(e) => update('telephone', e.target.value || null)}
              />
            </div>
          </div>

          <div>
            <label className="label">Présentation</label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="Quelques mots sur vous, votre poste, vos objectifs…"
              value={form.bio ?? ''}
              onChange={(e) => update('bio', e.target.value || null)}
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer mon profil'}
            </button>
          </div>
        </form>
      </div>

      <section className="card card-top-accent p-6">
        <h3 className="section-title">Mes équipes</h3>
        {loadingTeams ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : teams.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Aucune équipe liée pour le moment. Rejoignez une équipe depuis la page Mes fiches.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {teams.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-fca-border bg-fca-gray/40 px-4 py-3"
              >
                <span className="font-medium text-white">{t.name}</span>
                <span className="font-mono text-xs text-brand-400">{t.code}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
