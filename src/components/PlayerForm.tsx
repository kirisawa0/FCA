import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Player, PlayerInput, Team } from '@/types';
import { userFriendlyError } from '@/lib/dbErrors';

interface Props {
  initial?: Player;
  teams: Team[];
  onSubmit: (input: PlayerInput) => Promise<void>;
  onCancel: () => void;
}

function emptyForm(teams: Team[]): PlayerInput {
  return {
    nom: '',
    prenom: '',
    date_naissance: null,
    poste: null,
    telephone: null,
    email: null,
    team_ids: teams[0] ? [teams[0].id] : [],
  };
}

export function PlayerForm({ initial, teams, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<PlayerInput>(
    initial
      ? {
          nom: initial.nom,
          prenom: initial.prenom,
          date_naissance: initial.date_naissance,
          poste: initial.poste,
          telephone: initial.telephone,
          email: initial.email,
          team_ids: initial.teams?.map((t) => t.id) ?? [],
        }
      : emptyForm(teams)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PlayerInput>(key: K, value: PlayerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTeam(teamId: string) {
    setForm((f) => {
      const selected = f.team_ids.includes(teamId);
      return {
        ...f,
        team_ids: selected
          ? f.team_ids.filter((id) => id !== teamId)
          : [...f.team_ids, teamId],
      };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.prenom.trim() || !form.nom.trim()) {
      setError('Le prénom et le nom sont obligatoires.');
      return;
    }
    if (teams.length > 0 && form.team_ids.length === 0) {
      setError('Sélectionnez au moins une équipe.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err: unknown) {
      setError(userFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          Créez d&apos;abord une équipe dans{' '}
          <Link to="/coach/equipe" className="font-medium text-brand-400 hover:underline">
            Mon équipe
          </Link>{' '}
          pour pouvoir assigner vos joueurs.
        </div>
      ) : (
        <div>
          <label className="label">Équipes *</label>
          <p className="mb-2 text-xs text-zinc-500">
            Un joueur peut appartenir à plusieurs équipes (ex : U19 + Équipe B pro).
          </p>
          <div className="space-y-2 rounded-xl border border-fca-border bg-fca-gray/30 p-3">
            {teams.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-brand-400/5"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-fca-border accent-brand-400"
                  checked={form.team_ids.includes(t.id)}
                  onChange={() => toggleTeam(t.id)}
                />
                <span className="flex-1 text-sm text-zinc-200">{t.name}</span>
                <span className="font-mono text-xs text-brand-400">{t.code}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Date de naissance</label>
          <input
            type="date"
            className="input"
            value={form.date_naissance ?? ''}
            onChange={(e) => update('date_naissance', e.target.value || null)}
          />
        </div>
        <div>
          <label className="label">Poste</label>
          <input
            className="input"
            placeholder="Ex : Attaquant"
            value={form.poste ?? ''}
            onChange={(e) => update('poste', e.target.value || null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="email@exemple.com"
            value={form.email ?? ''}
            onChange={(e) => update('email', e.target.value || null)}
          />
          <p className="mt-1 text-xs text-zinc-500">
            L&apos;email doit correspondre au compte du joueur pour qu&apos;il
            puisse consulter sa fiche.
          </p>
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input
            className="input"
            value={form.telephone ?? ''}
            onChange={(e) => update('telephone', e.target.value || null)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annuler
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={saving || teams.length === 0}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
