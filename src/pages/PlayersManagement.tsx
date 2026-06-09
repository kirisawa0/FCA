import { useEffect, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';

import {

  listPlayers,

  createPlayer,

  updatePlayer,

  deletePlayer,

  checkPlayerAccounts,

} from '@/services/players';

import { listMyTeams } from '@/services/teams';

import type { Player, PlayerInput, Team } from '@/types';

import { Modal } from '@/components/ui/Modal';

import { Spinner } from '@/components/ui/Spinner';

import { PlayerForm } from '@/components/PlayerForm';

import { PlayerEmailStatus } from '@/components/PlayerEmailStatus';

import { computeAge, fullName } from '@/lib/format';

import { userFriendlyError, logDbError } from '@/lib/dbErrors';



export function PlayersManagement() {

  const { profile } = useAuth();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [players, setPlayers] = useState<Player[]>([]);

  const [teams, setTeams] = useState<Team[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const teamFilter = searchParams.get('team') ?? 'all';
  const activeTeam = teams.find((t) => t.id === teamFilter) ?? null;

  function setTeamFilter(value: string) {
    if (value === 'all') {
      searchParams.delete('team');
    } else {
      searchParams.set('team', value);
    }
    setSearchParams(searchParams, { replace: true });
  }

  const teamQuery = teamFilter !== 'all' ? `?team=${teamFilter}` : '';



  const [createOpen, setCreateOpen] = useState(false);

  const [editing, setEditing] = useState<Player | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [accountStatus, setAccountStatus] = useState<Record<string, boolean>>({});



  async function refresh() {

    if (!profile) return;

    setLoading(true);

    setLoadError(null);

    let errMsg: string | null = null;

    try {

      const t = await listMyTeams(profile.id);

      setTeams(t);

    } catch (err) {

      console.error(err);

      setTeams([]);

      errMsg = userFriendlyError(err);
      logDbError('PlayersManagement/teams', err);

    }

    try {

      const p = await listPlayers(profile.id, teamFilter === 'all' ? undefined : teamFilter);

      setPlayers(p);

      if (p.length > 0) {

        try {

          setAccountStatus(await checkPlayerAccounts(p.map((pl) => pl.id)));

        } catch (err) {

          console.warn('Statut compte joueur indisponible', err);

          setAccountStatus({});

        }

      } else {

        setAccountStatus({});

      }

    } catch (err) {

      console.error(err);

      setPlayers([]);

      if (!errMsg) {

        errMsg = userFriendlyError(err);
        logDbError('PlayersManagement/players', err);

      }

    } finally {

      setLoadError(errMsg);

      setLoading(false);

    }

  }



  useEffect(() => {

    refresh();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [profile, teamFilter]);



  async function handleCreate(input: PlayerInput) {

    if (!profile) return;

    const created = await createPlayer(profile.id, input);

    setPlayers((prev) =>

      [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom))

    );

    setCreateOpen(false);

  }



  async function handleUpdate(input: PlayerInput) {

    if (!editing) return;

    const updated = await updatePlayer(editing.id, input);

    setPlayers((prev) =>

      prev

        .map((p) => (p.id === updated.id ? updated : p))

        .sort((a, b) => a.nom.localeCompare(b.nom))

    );

    setEditing(null);

  }



  async function handleDelete(player: Player) {

    if (!(await confirm(`Supprimer définitivement ${fullName(player)} ?`))) return;

    await deletePlayer(player.id);

    setPlayers((prev) => prev.filter((p) => p.id !== player.id));

  }



  const filtered = players.filter((p) =>

    fullName(p).toLowerCase().includes(search.toLowerCase())

  );



  return (

    <div className="space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h1 className="page-title">
            {activeTeam ? (
              <>
                Joueurs — <span className="text-gold">{activeTeam.name}</span>
              </>
            ) : (
              <>
                Gestion des <span className="text-gold">joueurs</span>
              </>
            )}
          </h1>

          <p className="page-subtitle">
            {players.length} joueur(s) affiché(s)
            {activeTeam ? ` dans ${activeTeam.name}` : ''}.
          </p>

        </div>

        <button

          className="btn-primary"

          onClick={() => setCreateOpen(true)}

          disabled={teams.length === 0}

          title={teams.length === 0 ? 'Créez une équipe d’abord' : undefined}

        >

          + Nouveau joueur

        </button>

      </div>



      {loadError && (

        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">

          <p>{loadError}</p>

          <div className="mt-3 flex gap-2">

            <button type="button" className="btn-secondary text-xs" onClick={() => refresh()}>

              Réessayer

            </button>

            <Link to="/coach/equipe" className="btn-secondary text-xs">

              Mon équipe

            </Link>

          </div>

        </div>

      )}



      <div className="flex flex-col gap-3 sm:flex-row">

        <div className="relative flex-1">

          <svg className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

          </svg>

          <input

            className="input pl-10"

            placeholder="Rechercher un joueur…"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

          />

        </div>

        <select

          className="input sm:w-56"

          value={teamFilter}

          onChange={(e) => setTeamFilter(e.target.value)}

        >

          <option value="all">Toutes les équipes</option>

          {teams.map((t) => (

            <option key={t.id} value={t.id}>

              {t.name}

            </option>

          ))}

        </select>

      </div>



      {teams.length === 0 && !loading && (

        <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-5 py-4 text-sm text-amber-200">

          Créez une équipe dans{' '}

          <Link to="/coach/equipe" className="font-medium text-brand-400 hover:underline">

            Mon équipe

          </Link>{' '}

          pour assigner vos joueurs.

        </div>

      )}



      {loading ? (

        <div className="flex justify-center py-10">

          <Spinner />

        </div>

      ) : (

        <div className="card card-top-accent overflow-hidden">

          {filtered.length === 0 ? (

            <p className="px-6 py-12 text-center text-sm text-zinc-500">

              Aucun joueur trouvé.

            </p>

          ) : (

            <table className="w-full text-sm">

              <thead>

                <tr className="table-head">

                  <th className="px-6 py-3 font-medium">Joueur</th>

                  <th className="px-3 py-3 font-medium">Équipe</th>

                  <th className="px-3 py-3 font-medium">Poste</th>

                  <th className="px-3 py-3 font-medium">Email</th>

                  <th className="px-3 py-3 font-medium text-center">Âge</th>

                  <th className="px-3 py-3 font-medium text-right">Actions</th>

                </tr>

              </thead>

              <tbody>

                {filtered.map((p) => (

                  <tr key={p.id} className="table-row">

                    <td className="px-6 py-3">

                      <Link

                        to={`/coach/joueurs/${p.id}${teamQuery}`}

                        className="flex items-center gap-3 font-medium text-white hover:text-brand-300"

                      >

                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-xs font-semibold text-black shadow-gold-sm">

                          {p.prenom[0]?.toUpperCase() ?? '?'}

                        </span>

                        {fullName(p)}

                      </Link>

                    </td>

                    <td className="px-3 py-3 text-zinc-400">

                      {p.teams && p.teams.length > 0
                        ? p.teams.map((t) => t.name).join(', ')
                        : '—'}

                    </td>

                    <td className="px-3 py-3 text-zinc-400">{p.poste ?? '—'}</td>

                    <td className="px-3 py-3">
                      <PlayerEmailStatus
                        email={p.email}
                        hasAccount={p.email ? accountStatus[p.id] : undefined}
                      />
                    </td>

                    <td className="px-3 py-3 text-center text-zinc-400">

                      {computeAge(p.date_naissance) ?? '—'}

                    </td>

                    <td className="px-3 py-3">

                      <div className="flex justify-end gap-1">

                        <Link

                          to={`/coach/joueurs/${p.id}${teamQuery}`}

                          className="btn-ghost px-2 py-1"

                          title="Voir la fiche"

                        >

                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />

                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />

                          </svg>

                        </Link>

                        <button

                          onClick={() => setEditing(p)}

                          className="btn-ghost px-2 py-1"

                          title="Modifier"

                        >

                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />

                          </svg>

                        </button>

                        <button

                          onClick={() => handleDelete(p)}

                          className="btn-ghost px-2 py-1 text-red-500 hover:bg-red-950/40 hover:text-red-400"

                          title="Supprimer"

                        >

                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />

                          </svg>

                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      )}



      <Modal open={createOpen} title="Nouveau joueur" onClose={() => setCreateOpen(false)} maxWidth="max-w-2xl">

        <PlayerForm

          teams={teams}

          onSubmit={handleCreate}

          onCancel={() => setCreateOpen(false)}

        />

      </Modal>



      <Modal open={!!editing} title="Modifier le joueur" onClose={() => setEditing(null)} maxWidth="max-w-2xl">

        {editing && (

          <PlayerForm

            initial={editing}

            teams={teams}

            onSubmit={handleUpdate}

            onCancel={() => setEditing(null)}

          />

        )}

      </Modal>

    </div>

  );

}

