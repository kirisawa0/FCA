import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import { listPlayers } from '@/services/players';

import { getPrimaryTeam } from '@/services/teams';

import type { Player, Team } from '@/types';

import { StatCard } from '@/components/ui/StatCard';

import { Spinner } from '@/components/ui/Spinner';

import { computeAge, fullName } from '@/lib/format';



export function CoachDashboard() {

  const { profile } = useAuth();

  const [players, setPlayers] = useState<Player[]>([]);

  const [team, setTeam] = useState<Team | null>(null);

  const [loading, setLoading] = useState(true);

  const [copied, setCopied] = useState(false);



  useEffect(() => {

    if (!profile) return;

    Promise.all([listPlayers(profile.id), getPrimaryTeam(profile.id)])

      .then(([p, t]) => {

        setPlayers(p);

        setTeam(t);

      })

      .catch(console.error)

      .finally(() => setLoading(false));

  }, [profile]);



  const positions = new Set(players.map((p) => p.poste).filter(Boolean));



  async function copyCode() {

    if (!team) return;

    await navigator.clipboard.writeText(team.code);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

  }



  return (

    <div className="space-y-6">

      <div>

        <h1 className="page-title">Bonjour, <span className="text-gold">Coach</span> 👋</h1>

        <p className="page-subtitle">Vue d’ensemble de votre effectif.</p>

      </div>



      {!loading && !team && (

        <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-5 py-4">

          <p className="text-sm text-amber-200">

            Créez votre équipe pour obtenir un code d’invitation à partager à vos joueurs.

          </p>

          <Link to="/coach/equipe" className="btn-primary mt-3 inline-flex text-sm">

            Créer mon équipe →

          </Link>

        </div>

      )}



      {!loading && team && (

        <div className="card card-top-accent flex flex-wrap items-center justify-between gap-4 px-5 py-4">

          <div>

            <p className="text-xs uppercase tracking-wide text-zinc-500">Équipe active</p>

            <p className="font-semibold text-white">{team.name}</p>

            <p className="mt-0.5 font-mono text-sm text-gold">{team.code}</p>

          </div>

          <div className="flex gap-2">

            <button type="button" className="btn-secondary text-sm" onClick={copyCode}>

              {copied ? 'Copié !' : 'Copier le code'}

            </button>

            <Link to="/coach/equipe" className="btn-secondary text-sm">

              Gérer

            </Link>

          </div>

        </div>

      )}



      {loading ? (

        <div className="flex justify-center py-10">

          <Spinner />

        </div>

      ) : (

        <>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">

            <StatCard label="Joueurs" value={players.length} />

            <StatCard label="Postes couverts" value={positions.size} accent="text-emerald-400" />

            <StatCard

              label="Avec email"

              value={players.filter((p) => p.email).length}

              accent="text-white"

              hint="Liés à un compte joueur"

            />

          </div>



          <section className="card card-top-accent">

            <div className="flex items-center justify-between border-b border-fca-border px-6 py-4">

              <h2 className="section-title">Effectif récent</h2>

              <Link to="/coach/joueurs" className="link-accent text-sm font-medium">

                Gérer les joueurs →

              </Link>

            </div>



            {players.length === 0 ? (

              <div className="px-6 py-12 text-center">

                <p className="text-zinc-500">Aucun joueur pour l’instant.</p>

                <p className="mt-1 text-sm text-zinc-600">

                  Partagez votre code équipe ou ajoutez des joueurs manuellement.

                </p>

                <Link to="/coach/joueurs" className="btn-primary mt-4 inline-flex">

                  Gérer les joueurs

                </Link>

              </div>

            ) : (

              <ul className="divide-y divide-fca-border/60">

                {players.slice(0, 6).map((p) => (

                  <li key={p.id}>

                    <Link

                      to={`/coach/joueurs/${p.id}`}

                      className="flex items-center gap-4 px-6 py-3 transition hover:bg-brand-400/[0.04]"

                    >

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient font-semibold text-black shadow-gold-sm">

                        {p.prenom[0]?.toUpperCase() ?? '?'}

                      </div>

                      <div className="flex-1">

                        <p className="font-medium text-white">{fullName(p)}</p>

                        <p className="text-xs text-zinc-500">

                          {p.poste ?? 'Poste non défini'}

                          {computeAge(p.date_naissance) != null

                            ? ` • ${computeAge(p.date_naissance)} ans`

                            : ''}

                        </p>

                      </div>

                      <svg className="h-5 w-5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />

                      </svg>

                    </Link>

                  </li>

                ))}

              </ul>

            )}

          </section>

        </>

      )}

    </div>

  );

}

