import { useState, type FormEvent } from 'react';
import { joinTeamByCode } from '@/services/teams';
import { seedDefaultCategories } from '@/services/statCategories';
import { userFriendlyError, dbErrorMessage } from '@/lib/dbErrors';

interface Props {
  email: string;
  defaultNom?: string;
  defaultPrenom?: string;
  defaultTeamCode?: string;
  existingPlayer?: boolean;
  onJoined: () => void;
  onCancel?: () => void;
}

export function JoinTeamForm({
  email,
  defaultNom = '',
  defaultPrenom = '',
  defaultTeamCode = '',
  existingPlayer = false,
  onJoined,
  onCancel,
}: Props) {
  const [code, setCode] = useState(defaultTeamCode);
  const [nom, setNom] = useState(defaultNom);
  const [prenom, setPrenom] = useState(defaultPrenom);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const playerId = await joinTeamByCode(
        code,
        existingPlayer ? undefined : nom,
        existingPlayer ? undefined : prenom
      );
      if (!existingPlayer) {
        try {
          await seedDefaultCategories(playerId);
        } catch (err) {
          console.warn('Stats non initialisées', err);
        }
      }
      if (existingPlayer) {
        setSuccess('Équipe ajoutée à votre fiche.');
        setCode('');
        setTimeout(onJoined, 800);
      } else {
        onJoined();
      }
    } catch (err) {
      const friendly = userFriendlyError(err);
      const msg = dbErrorMessage(err);
      if (msg.includes('Code équipe invalide')) {
        setError('Code équipe invalide. Vérifiez auprès de votre coach.');
      } else if (msg.includes('déjà dans cette équipe')) {
        setError('Vous êtes déjà inscrit dans cette équipe.');
      } else if (msg.includes('autre coach')) {
        setError('Cette équipe appartient à un autre coach.');
      } else {
        setError(friendly);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-top-accent mx-auto max-w-md p-8">
      <h2 className="text-lg font-semibold text-white">
        {existingPlayer ? 'Rejoindre une autre équipe' : 'Rejoindre une équipe'}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        {existingPlayer
          ? 'Ajoutez une équipe supplémentaire à votre fiche existante.'
          : `Saisissez le code fourni par votre coach (${email}).`}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <div>
          <label className="label">Code équipe</label>
          <input
            className="input font-mono uppercase tracking-wider"
            placeholder="FCA-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
        </div>

        {!existingPlayer && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input
                className="input"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Nom</label>
              <input
                className="input"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
              Annuler
            </button>
          )}
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Inscription…' : existingPlayer ? 'Ajouter l’équipe' : 'Rejoindre l’équipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
