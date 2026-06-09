import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildPlayerFicheViews,
  listMyPlayers,
  type PlayerFicheView,
} from '@/services/players';
import { ensurePlayerJoined } from '@/services/teams';
import { getCurrentUser } from '@/lib/supabase';
import type { Player } from '@/types';
import { PlayerSheet } from '@/components/PlayerSheet';
import { JoinTeamForm } from '@/components/JoinTeamForm';
import { Spinner } from '@/components/ui/Spinner';

export function PlayerDashboard() {
  const { profile, session } = useAuth();
  const meta = session?.user?.user_metadata as
    | { nom?: string; prenom?: string; team_code?: string }
    | undefined;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinMore, setShowJoinMore] = useState(false);
  const [selectedViewKey, setSelectedViewKey] = useState<string | null>(null);

  const ficheViews = useMemo(() => buildPlayerFicheViews(players), [players]);
  const selectedView: PlayerFicheView | null =
    ficheViews.find((v) => v.key === selectedViewKey) ?? ficheViews[0] ?? null;
  const primaryPlayer = players[0] ?? null;

  async function load() {
    if (!profile) return;
    setLoading(true);
    try {
      const user = await getCurrentUser();
      await ensurePlayerJoined(profile.email, user?.user_metadata);
      const loaded = await listMyPlayers(profile.email);
      setPlayers(loaded);
      const views = buildPlayerFicheViews(loaded);
      setSelectedViewKey((prev) =>
        prev && views.some((v) => v.key === prev) ? prev : (views[0]?.key ?? null)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Mes <span className="text-gold">fiches</span></h1>
        <p className="page-subtitle">
          Consultez vos statistiques et les retours de votre coach pour chaque équipe.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : players.length === 0 ? (
        <JoinTeamForm
          email={profile?.email ?? ''}
          defaultNom={meta?.nom ?? ''}
          defaultPrenom={meta?.prenom ?? ''}
          defaultTeamCode={meta?.team_code ?? ''}
          onJoined={load}
        />
      ) : (
        <>
          {ficheViews.length > 1 && (
            <div className="card card-top-accent p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Choisir une équipe
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ficheViews.map((view) => (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setSelectedViewKey(view.key)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                      selectedView?.key === view.key
                        ? 'border-brand-400/50 bg-gold-gradient text-black shadow-gold-sm'
                        : 'border-fca-border bg-fca-gray/40 text-zinc-300 hover:border-brand-400/30 hover:text-white'
                    }`}
                  >
                    <span className="block">{view.team?.name ?? 'Ma fiche'}</span>
                    {view.team && (
                      <span
                        className={`mt-0.5 block font-mono text-xs ${
                          selectedView?.key === view.key ? 'text-black/70' : 'text-brand-400'
                        }`}
                      >
                        {view.team.code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showJoinMore ? (
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setShowJoinMore(true)}
            >
              + Rejoindre une autre équipe
            </button>
          ) : (
            <JoinTeamForm
              email={profile?.email ?? ''}
              existingPlayer
              defaultNom={primaryPlayer?.nom ?? ''}
              defaultPrenom={primaryPlayer?.prenom ?? ''}
              onJoined={() => {
                setShowJoinMore(false);
                load();
              }}
              onCancel={() => setShowJoinMore(false)}
            />
          )}

          {selectedView && (
            <PlayerSheet
              player={selectedView.player}
              activeTeam={selectedView.team}
              canEdit={false}
            />
          )}
        </>
      )}
    </div>
  );
}
