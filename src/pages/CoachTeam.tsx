import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  listMyTeams,
  createTeam,
  deleteTeam,
  countTeamPlayers,
} from '@/services/teams';
import { listPlayers } from '@/services/players';
import type { Player, Team } from '@/types';
import { fullName } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { useConfirm } from '@/contexts/ConfirmContext';
import { userFriendlyError, logDbError } from '@/lib/dbErrors';

export function CoachTeam() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const [teams, setTeams] = useState<Team[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});
  const [playersByTeam, setPlayersByTeam] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    if (!profile) return;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listMyTeams(profile.id);
      setTeams(list);
      const counts: Record<string, number> = {};
      const byTeam: Record<string, Player[]> = {};
      await Promise.all(
        list.map(async (t) => {
          const [count, players] = await Promise.all([
            countTeamPlayers(t.id),
            listPlayers(profile.id, t.id),
          ]);
          counts[t.id] = count;
          byTeam[t.id] = players;
        })
      );
      setPlayerCounts(counts);
      setPlayersByTeam(byTeam);
    } catch (err) {
      console.error(err);
      logDbError('CoachTeam/load', err);
      setLoadError(userFriendlyError(err));
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!profile || !teamName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTeam(profile.id, { name: teamName.trim() });
      setTeamName('');
      setModalOpen(false);
      await load();
    } catch (err) {
      logDbError('CoachTeam/create', err);
      setError(userFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team: Team) {
    if (!(await confirm(`Supprimer l’équipe « ${team.name} » ?`))) return;
    try {
      await deleteTeam(team.id);
      await load();
    } catch (err) {
      setLoadError(userFriendlyError(err));
    }
  }

  async function copyCode(code: string, id: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            Mon <span className="text-gold">équipe</span>
          </h1>
          <p className="page-subtitle">
            Créez une équipe et partagez le code d’invitation à vos joueurs.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setModalOpen(true)}>
          + Créer une équipe
        </button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <p>{loadError}</p>
          <button type="button" className="btn-secondary mt-3 text-xs" onClick={() => load()}>
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : teams.length === 0 && !loadError ? (
        <div className="card card-top-accent p-10 text-center">
          <p className="text-zinc-300">Vous n’avez pas encore d’équipe.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Créez-en une pour obtenir un code que vos joueurs utiliseront à l’inscription.
          </p>
          <button type="button" className="btn-primary mt-4 inline-flex" onClick={() => setModalOpen(true)}>
            Créer ma première équipe
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="card card-top-accent p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{team.name}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {playerCounts[team.id] ?? 0} joueur{(playerCounts[team.id] ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(team)}
                  className="text-zinc-500 transition hover:text-red-400"
                  aria-label="Supprimer l'équipe"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 rounded-xl border border-brand-400/20 bg-brand-400/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Code équipe</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-mono text-xl font-bold tracking-wider text-gold">
                    {team.code || '—'}
                  </span>
                  {team.code && (
                    <button
                      type="button"
                      className="btn-secondary shrink-0 text-xs"
                      onClick={() => copyCode(team.code, team.id)}
                    >
                      {copiedId === team.id ? 'Copié !' : 'Copier'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-fca-border pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Joueurs de l&apos;équipe
                  </p>
                  <Link
                    to={`/coach/joueurs?team=${team.id}`}
                    className="text-xs font-medium text-brand-400 hover:underline"
                  >
                    Gérer →
                  </Link>
                </div>
                {(playersByTeam[team.id]?.length ?? 0) === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">Aucun joueur dans cette équipe.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {playersByTeam[team.id].map((player) => (
                      <li key={player.id}>
                        <Link
                          to={`/coach/joueurs/${player.id}?team=${team.id}`}
                          className="flex items-center gap-3 rounded-xl border border-fca-border bg-fca-gray/30 px-3 py-2.5 transition hover:border-brand-400/30 hover:bg-fca-gray/50"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-gradient text-xs font-semibold text-black">
                            {player.prenom[0]?.toUpperCase() ?? '?'}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">{fullName(player)}</p>
                            <p className="truncate text-xs text-zinc-500">
                              {player.poste ?? 'Poste non défini'}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Créer une équipe">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div>
            <label className="label">Nom de l’équipe</label>
            <input
              className="input"
              placeholder="Ex : U17 FCA"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <p className="text-xs text-zinc-500">
            Un code unique (ex : FCA-A3K9X2) sera généré automatiquement.
          </p>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
