import { useEffect, useState, type FormEvent } from 'react';
import type { Player, PlayerNote, Team } from '@/types';
import { listNotes, addNote, deleteNote } from '@/services/notes';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { PlayerStatsPanel } from '@/components/PlayerStatsPanel';
import { PlayerEmailStatus } from '@/components/PlayerEmailStatus';
import { checkPlayerAccounts } from '@/services/players';
import { Spinner } from '@/components/ui/Spinner';
import { computeAge, formatDate, fullName } from '@/lib/format';

interface Props {
  player: Player;
  canEdit: boolean;
  activeTeam?: Team | null;
}

export function PlayerSheet({ player, canEdit, activeTeam }: Props) {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean | undefined>(undefined);

  const teamContext =
    activeTeam ?? (player.teams?.length === 1 ? player.teams[0] : null);
  const teamId = teamContext?.id ?? null;
  const age = computeAge(player.date_naissance);

  useEffect(() => {
    if (!canEdit || !player.email) {
      setHasAccount(undefined);
      return;
    }
    checkPlayerAccounts([player.id])
      .then((map) => setHasAccount(map[player.id]))
      .catch(() => setHasAccount(undefined));
  }, [player.id, player.email, canEdit]);

  useEffect(() => {
    setLoadingNotes(true);
    listNotes(player.id, teamId)
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoadingNotes(false));
  }, [player.id, teamId]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!profile || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const created = await addNote(player.id, profile.id, newNote.trim(), teamId);
      setNotes((prev) => [created, ...prev]);
      setNewNote('');
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de l’ajout de la note.');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(id: string) {
    if (!(await confirm('Supprimer cette note ?'))) return;
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="relative flex items-center gap-5 bg-gradient-to-r from-fca-black via-fca-surface to-fca-black px-6 py-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(250,204,21,0.14),_transparent_60%)]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-gradient text-3xl font-extrabold text-black shadow-gold">
            {player.prenom[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="relative">
            <h2 className="text-2xl font-bold text-white">{fullName(player)}</h2>
            <p className="font-medium text-brand-400">
              {player.poste ?? 'Poste non défini'}
              {age != null ? ` • ${age} ans` : ''}
            </p>
            {teamContext ? (
              <p className="mt-2 text-sm font-medium text-brand-300">
                Équipe : {teamContext.name}
                <span className="ml-2 font-mono text-xs text-brand-400/80">{teamContext.code}</span>
              </p>
            ) : (
              player.teams &&
              player.teams.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {player.teams.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full border border-brand-400/25 bg-brand-400/10 px-2.5 py-0.5 text-xs font-medium text-brand-300"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-5 text-sm sm:grid-cols-4">
          <Info label="Date de naissance" value={formatDate(player.date_naissance)} />
          <Info label="Poste" value={player.poste ?? '—'} />
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Email / Compte</p>
            <div className="mt-0.5 font-medium">
              <PlayerEmailStatus email={player.email} hasAccount={hasAccount} />
            </div>
            {canEdit && player.email && hasAccount === false && (
              <p className="mt-1 text-xs text-zinc-500">
                Le joueur n&apos;a pas encore créé son compte avec cet email.
              </p>
            )}
          </div>
          <Info label="Téléphone" value={player.telephone ?? '—'} />
        </div>
      </div>

      <PlayerStatsPanel playerId={player.id} teamId={teamId} canEdit={canEdit} />

      <section className="card card-top-accent">
        <div className="border-b border-fca-border px-6 py-4">
          <h3 className="section-title">
            Notes du coach
            {teamContext && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                — {teamContext.name}
              </span>
            )}
          </h3>
        </div>
        <div className="space-y-4 px-6 py-5">
          {canEdit && (
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                className="input"
                placeholder="Ajouter une note…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary shrink-0"
                disabled={savingNote || !newNote.trim()}
              >
                Publier
              </button>
            </form>
          )}

          {loadingNotes ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Aucune note pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-fca-border bg-fca-gray/50 px-4 py-3 transition hover:border-brand-400/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-zinc-200">{n.note}</p>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="shrink-0 text-zinc-500 transition hover:text-red-500"
                        aria-label="Supprimer"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    {formatDate(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 font-medium text-zinc-100">{value}</p>
    </div>
  );
}
