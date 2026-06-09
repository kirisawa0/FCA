import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getPlayer } from '@/services/players';
import { userFriendlyError } from '@/lib/dbErrors';
import type { Player, Team } from '@/types';
import { PlayerSheet } from '@/components/PlayerSheet';
import { Spinner } from '@/components/ui/Spinner';

export function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamIdFromUrl = searchParams.get('team');
  const teams = player?.teams ?? [];

  const activeTeam: Team | null = useMemo(() => {
    if (!teams.length) return null;
    if (teamIdFromUrl) {
      return teams.find((t) => t.id === teamIdFromUrl) ?? teams[0];
    }
    return teams.length === 1 ? teams[0] : null;
  }, [teams, teamIdFromUrl]);

  const backLink =
    teamIdFromUrl && activeTeam
      ? `/coach/joueurs?team=${teamIdFromUrl}`
      : '/coach/joueurs';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPlayer(id)
      .then(setPlayer)
      .catch((err) => setError(userFriendlyError(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function selectTeam(team: Team) {
    setSearchParams({ team: team.id }, { replace: true });
  }

  return (
    <div className="space-y-5">
      <Link
        to={backLink}
        className="link-accent inline-flex items-center gap-1 text-sm font-medium"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Retour à la liste
        {activeTeam && ` — ${activeTeam.name}`}
      </Link>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error || !player ? (
        <div className="card card-top-accent p-8 text-center text-zinc-400">
          {error ?? 'Fiche introuvable.'}
        </div>
      ) : (
        <>
          {teams.length > 1 && (
            <div className="card card-top-accent p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Fiche pour l&apos;équipe
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => selectTeam(team)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                      activeTeam?.id === team.id
                        ? 'border-brand-400/50 bg-gold-gradient text-black shadow-gold-sm'
                        : 'border-fca-border bg-fca-gray/40 text-zinc-300 hover:border-brand-400/30 hover:text-white'
                    }`}
                  >
                    <span className="block">{team.name}</span>
                    <span
                      className={`mt-0.5 block font-mono text-xs ${
                        activeTeam?.id === team.id ? 'text-black/70' : 'text-brand-400'
                      }`}
                    >
                      {team.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {teams.length > 1 && !activeTeam ? (
            <div className="card card-top-accent p-8 text-center text-zinc-400">
              Sélectionnez une équipe pour consulter ou ajouter des notes sur cette fiche.
            </div>
          ) : (
            <PlayerSheet player={player} activeTeam={activeTeam} canEdit />
          )}
        </>
      )}
    </div>
  );
}
