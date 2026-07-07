import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { listPlayers, type PlayerFicheView, buildPlayerFicheViews, listMyPlayers } from '@/services/players';
import { listMyTeams } from '@/services/teams';
import {
  listCategories,
  seedPlayerCategoriesFromTeam,
} from '@/services/statCategories';

import { listEvaluations, getFinalNote, computeAverage } from '@/services/stats';
import {
  listMatchStats,
  addMatchStat,
  deleteMatchStat,
} from '@/services/matchStats';
import type { MatchStat, MatchStatInput } from '@/types/matchStats';
import { computePoints, computePlaquagePct, EMPTY_MATCH_STAT_INPUT } from '@/types/matchStats';
import type { Player, StatCategory, StatEvaluation, Team } from '@/types';
import { LineChart } from '@/components/charts/LineChart';
import { RadarChart } from '@/components/charts/RadarChart';
import { BarChart } from '@/components/charts/BarChart';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate, fullName } from '@/lib/format';

/* ─── helpers ───────────────────────────────────────────────── */

function noteColor(v: number) {
  if (v >= 7.5) return 'text-emerald-400';
  if (v >= 5) return 'text-brand-400';
  return 'text-red-400';
}

function trendIcon(delta: number) {
  if (delta > 0.2) return '▲';
  if (delta < -0.2) return '▼';
  return '—';
}

function trendColor(delta: number) {
  if (delta > 0.2) return 'text-emerald-400';
  if (delta < -0.2) return 'text-red-400';
  return 'text-zinc-500';
}

function sum<T>(arr: T[], key: (t: T) => number) {
  return arr.reduce((acc, t) => acc + key(t), 0);
}

/* ─── mini card de stat ─────────────────────────────────────── */

function MiniStat({
  label,
  value,
  sub,
  accent = 'text-brand-400',
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card card-top-accent flex flex-col gap-1 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

/* ─── formulaire match ──────────────────────────────────────── */

function MatchForm({
  initial,
  onSubmit,
  onCancel,
  saving,
}: {
  initial: Omit<MatchStatInput, 'player_id' | 'team_id'>;
  onSubmit: (v: typeof initial) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);

  function n(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: k === 'adversaire' || k === 'notes' ? v : Number(v) }));
  }

  function row(
    label: string,
    key: keyof typeof form,
    type: 'text' | 'number' | 'date' = 'number',
    max?: number
  ) {
    return (
      <div key={key}>
        <label className="label">{label}</label>
        <input
          type={type}
          min={type === 'number' ? 0 : undefined}
          max={max}
          className="input"
          value={(form[key] ?? '') as string | number}
          onChange={(e) => n(key, e.target.value)}
        />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        {row('Date du match', 'match_date', 'date')}
        {row('Adversaire', 'adversaire', 'text')}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Points marqués</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {row('Essais', 'essais')}
        {row('Transformations', 'transformations')}
        {row('Pénalités', 'penalites')}
        {row('Drops', 'drops')}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions de jeu</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {row('Plaquages réussis', 'plaquages_reussis')}
        {row('Plaquages manqués', 'plaquages_manques')}
        {row('Passes', 'passes')}
        {row('Mètres parcourus', 'metres_parcourus')}
        {row('Ballons portés', 'ballons_portes')}
        {row('Minutes jouées', 'minutes_jouees', 'number', 120)}
      </div>

      <div>
        <label className="label">Notes (optionnel)</label>
        <textarea
          className="input min-h-[60px] resize-y"
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

/* ─── vue stats d'un joueur ─────────────────────────────────── */

interface PlayerStatsViewProps {
  player: Player;
  teamId: string | null;
  canEdit: boolean;
  teamLabel?: string;
}

function PlayerStatsView({ player, teamId, canEdit, teamLabel }: PlayerStatsViewProps) {
  const { profile } = useAuth();
  const confirm = useConfirm();

  const [categories, setCategories] = useState<StatCategory[]>([]);
  const [evaluations, setEvaluations] = useState<StatEvaluation[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'evaluations' | 'matchs'>('evaluations');

  useEffect(() => {
  if (!teamId) {
    setCategories([]);
    setEvaluations([]);
    setMatchStats([]);
    setLoading(false);
    return;
  }

  setLoading(true);

  Promise.all([
    seedPlayerCategoriesFromTeam(player.id, teamId).then(() =>
      listCategories(player.id, teamId)
    ),
    listEvaluations(player.id, teamId),
    listMatchStats(player.id, teamId),
  ])
    .then(([cats, evals, ms]) => {
      setCategories(cats);
      setEvaluations(evals);
      setMatchStats(ms);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, [player.id, teamId]);

  /* ── computed ── */
  const sortedEvals = useMemo(
    () => [...evaluations].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [evaluations]
  );
  const latestEval = evaluations[0] ?? null;
  const latestNote = latestEval ? getFinalNote(latestEval) : null;
  const firstNote = sortedEvals.length > 1 ? getFinalNote(sortedEvals[0]) : null;
  const delta = latestNote != null && firstNote != null ? latestNote - firstNote : null;
  const avgNote =
    evaluations.length > 0
      ? computeAverage(evaluations.map((e) => getFinalNote(e)))
      : null;

  const radarPoints = useMemo(() => {
    if (!latestEval?.values) return [];
    return categories.map((c) => {
      const v = latestEval.values!.find((sv) => sv.category_id === c.id);
      return { label: c.label, value: v?.valeur ?? 0, max: 10 };
    });
  }, [categories, latestEval]);

  const lineData = useMemo(
    () =>
      sortedEvals.map((e) => ({
        label: new Date(e.created_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        value: getFinalNote(e),
      })),
    [sortedEvals]
  );

  const lineDataByLabel = useMemo(() => {
    return categories.map((c) => ({
      label: c.label,
      color: `hsl(${(categories.indexOf(c) * 55 + 40) % 360}, 70%, 65%)`,
      points: sortedEvals.map((e) => {
        const v = e.values?.find((sv) => sv.category_id === c.id);
        return {
          label: new Date(e.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
          }),
          value: v?.valeur ?? 0,
          x: 0,
          y: 0,
        };
      }),
    }));
  }, [categories, sortedEvals]);

  /* Points forts / faibles */
  const avgByLabel = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const e of evaluations) {
      for (const v of e.values ?? []) {
        const label = categories.find((c) => c.id === v.category_id)?.label;
        if (label) {
          map[label] = map[label] ?? [];
          map[label].push(v.valeur);
        }
      }
    }
    return Object.entries(map).map(([label, vals]) => ({
      label,
      avg: computeAverage(vals),
    }));
  }, [categories, evaluations]);

  const sorted = [...avgByLabel].sort((a, b) => b.avg - a.avg);
  const pointsForts = sorted.slice(0, 2);
  const pointsFaibles = [...sorted].reverse().slice(0, 2);

  /* Rugby stats totaux */
  const totalEssais = sum(matchStats, (m) => m.essais);
  const totalPoints = sum(matchStats, (m) => computePoints(m));
  const totalPlaquages = sum(matchStats, (m) => m.plaquages_reussis + m.plaquages_manques);
  const totalPlaquagesReussis = sum(matchStats, (m) => m.plaquages_reussis);
  const pctPlaqs = totalPlaquages > 0 ? Math.round((totalPlaquagesReussis / totalPlaquages) * 100) : null;
  const totalPasses = sum(matchStats, (m) => m.passes);
  const totalMetres = sum(matchStats, (m) => m.metres_parcourus);
  const totalMatchs = matchStats.length;

  const matchBarEssais = matchStats.slice(-8).map((m) => ({
    label: m.adversaire ? m.adversaire.slice(0, 8) : formatDate(m.match_date),
    value: m.essais,
    color: '#facc15',
  }));

  const matchBarPoints = matchStats.slice(-8).map((m) => ({
    label: m.adversaire ? m.adversaire.slice(0, 8) : formatDate(m.match_date),
    value: computePoints(m),
    color: '#34d399',
  }));

  async function handleAddMatch(form: Omit<MatchStatInput, 'player_id' | 'team_id'>) {
    if (!profile) return;
    setSaving(true);
    try {
      const created = await addMatchStat(profile.id, {
        ...form,
        player_id: player.id,
        team_id: teamId,
      });
      setMatchStats((prev) =>
        [...prev, created].sort((a, b) => a.match_date.localeCompare(b.match_date))
      );
      setMatchModal(false);
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMatch(id: string) {
    if (!(await confirm('Supprimer ce match ?'))) return;
    await deleteMatchStat(id);
    setMatchStats((prev) => prev.filter((m) => m.id !== id));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="card card-top-accent overflow-hidden">
        <div className="relative bg-gradient-to-r from-fca-black via-fca-surface to-fca-black px-6 py-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,_rgba(250,204,21,0.14),_transparent_60%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient text-2xl font-extrabold text-black shadow-gold">
                {player.prenom[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{fullName(player)}</h2>
                <p className="text-sm text-brand-400">
                  {player.poste ?? 'Poste non défini'}
                  {teamLabel && <span className="ml-2 text-zinc-500">— {teamLabel}</span>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-right">
              {latestNote != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Note actuelle</p>
                  <p className={`text-4xl font-extrabold leading-none ${noteColor(latestNote)}`}>
                    {latestNote.toFixed(1)}
                    <span className="text-lg text-zinc-600">/10</span>
                  </p>
                </div>
              )}
              {avgNote != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Moyenne</p>
                  <p className="text-2xl font-bold text-zinc-300">{avgNote.toFixed(1)}</p>
                </div>
              )}
              {delta != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Progression</p>
                  <p className={`text-2xl font-bold ${trendColor(delta)}`}>
                    {trendIcon(delta)} {Math.abs(delta).toFixed(1)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Évaluations</p>
                <p className="text-2xl font-bold text-zinc-300">{evaluations.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Matchs</p>
                <p className="text-2xl font-bold text-zinc-300">{totalMatchs}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 border-b border-fca-border">
        {(['evaluations', 'matchs'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab
                ? 'border-b-2 border-brand-400 text-brand-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'evaluations' ? 'Évaluations' : 'Matchs rugby'}
          </button>
        ))}
      </div>

      {/* ══════════ TAB ÉVALUATIONS ══════════ */}
      {activeTab === 'evaluations' && (
        <div className="space-y-6">
          {evaluations.length === 0 ? (
            <div className="card card-top-accent p-10 text-center text-zinc-500">
              Aucune évaluation enregistrée pour ce joueur.
            </div>
          ) : (
            <>
              {/* Points forts / faibles */}
              {avgByLabel.length >= 2 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="card card-top-accent p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Points forts
                    </p>
                    <ul className="mt-3 space-y-2">
                      {pointsForts.map((p) => (
                        <li key={p.label} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-200">{p.label}</span>
                          <span className="font-bold text-emerald-400">{p.avg.toFixed(1)}/10</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="card card-top-accent p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Axes de progression
                    </p>
                    <ul className="mt-3 space-y-2">
                      {pointsFaibles.map((p) => (
                        <li key={p.label} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-200">{p.label}</span>
                          <span className="font-bold text-amber-400">{p.avg.toFixed(1)}/10</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Radar + Ligne globale */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {radarPoints.length >= 3 && (
                  <div className="card card-top-accent p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Profil — dernière évaluation
                    </p>
                    <RadarChart points={radarPoints} />
                  </div>
                )}
                {lineData.length >= 2 && (
                  <div className="card card-top-accent p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Évolution note globale
                    </p>
                    <LineChart
                      series={[
                        {
                          label: 'Note globale',
                          color: '#facc15',
                          points: lineData.map((d, i) => ({ ...d, x: i, y: d.value })),
                        },
                      ]}
                      minY={0}
                      maxY={10}
                      yLabel="/10"
                    />
                  </div>
                )}
                {lineData.length === 1 && (
                  <div className="card card-top-accent flex items-center justify-center p-5">
                    <p className="text-sm text-zinc-500">
                      Ajoutez au moins 2 évaluations pour voir la courbe d&apos;évolution.
                    </p>
                  </div>
                )}
              </div>

              {/* Courbes par catégorie */}
              {sortedEvals.length >= 2 && lineDataByLabel.length > 0 && (
                <div className="card card-top-accent p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Évolution par critère
                  </p>
                  <LineChart series={lineDataByLabel} minY={0} maxY={10} yLabel="/10" />
                  <div className="mt-3 flex flex-wrap gap-3">
                    {lineDataByLabel.map((s) => (
                      <span key={s.label} className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: s.color }}
                        />
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Historique table */}
              <div className="card card-top-accent overflow-hidden">
                <div className="border-b border-fca-border px-6 py-4">
                  <h3 className="section-title">Historique des évaluations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-head">
                        <th className="px-6 py-3 font-medium">Date</th>
                        {categories.map((c) => (
                          <th key={c.id} className="px-3 py-3 text-center font-medium">
                            {c.label}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center font-medium">Globale</th>
                        <th className="px-3 py-3 font-medium text-zinc-400">Commentaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...evaluations].map((ev) => {
                        const valMap = Object.fromEntries(
                          (ev.values ?? []).map((v) => [v.category_id, v.valeur])
                        );
                        const note = getFinalNote(ev);
                        return (
                          <tr key={ev.id} className="table-row">
                            <td className="px-6 py-3 text-zinc-400">
                              {new Date(ev.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            {categories.map((c) => (
                              <td key={c.id} className="px-3 py-3 text-center">
                                <span
                                  className={`font-semibold ${
                                    valMap[c.id] >= 7
                                      ? 'text-emerald-400'
                                      : valMap[c.id] >= 5
                                      ? 'text-brand-400'
                                      : 'text-red-400'
                                  }`}
                                >
                                  {valMap[c.id] != null ? valMap[c.id] : '—'}
                                </span>
                              </td>
                            ))}
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`text-lg font-extrabold ${noteColor(note)}`}
                              >
                                {note.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-zinc-500">
                              {ev.commentaire ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB MATCHS ══════════ */}
      {activeTab === 'matchs' && (
        <div className="space-y-6">
          {/* Actions */}
          {canEdit && (
            <div className="flex justify-end">
              <button className="btn-primary" onClick={() => setMatchModal(true)}>
                + Nouveau match
              </button>
            </div>
          )}

          {matchStats.length === 0 ? (
            <div className="card card-top-accent p-10 text-center text-zinc-500">
              Aucun match enregistré.
              {canEdit && (
                <button
                  className="btn-primary mt-4 inline-flex"
                  onClick={() => setMatchModal(true)}
                >
                  Enregistrer un match
                </button>
              )}
            </div>
          ) : (
            <>
              {/* KPI rugby */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <MiniStat label="Matchs joués" value={totalMatchs} />
                <MiniStat
                  label="Essais"
                  value={totalEssais}
                  sub={`${(totalEssais / totalMatchs).toFixed(1)} / match`}
                  accent="text-gold"
                />
                <MiniStat
                  label="Points marqués"
                  value={totalPoints}
                  sub={`${(totalPoints / totalMatchs).toFixed(1)} / match`}
                  accent="text-emerald-400"
                />
                <MiniStat
                  label="Plaquages %"
                  value={pctPlaqs != null ? `${pctPlaqs}%` : '—'}
                  sub={`${totalPlaquagesReussis}/${totalPlaquages}`}
                  accent={pctPlaqs != null && pctPlaqs >= 70 ? 'text-emerald-400' : 'text-amber-400'}
                />
                <MiniStat
                  label="Passes"
                  value={totalPasses}
                  sub={`${(totalPasses / totalMatchs).toFixed(1)} / match`}
                  accent="text-blue-400"
                />
                <MiniStat
                  label="Mètres parcourus"
                  value={totalMetres}
                  sub={`${(totalMetres / totalMatchs).toFixed(0)} / match`}
                  accent="text-violet-400"
                />
              </div>

              {/* Graphiques match */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {matchBarEssais.length >= 2 && (
                  <div className="card card-top-accent p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Essais par match (8 derniers)
                    </p>
                    <BarChart bars={matchBarEssais} />
                  </div>
                )}
                {matchBarPoints.length >= 2 && (
                  <div className="card card-top-accent p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      Points par match (8 derniers)
                    </p>
                    <BarChart bars={matchBarPoints} defaultColor="#34d399" />
                  </div>
                )}
              </div>

              {/* Ligne évolution plaquages */}
              {matchStats.length >= 2 && (
                <div className="card card-top-accent p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Évolution plaquages (%)
                  </p>
                  <LineChart
                    series={[
                      {
                        label: '% plaquages',
                        color: '#818cf8',
                        points: matchStats.map((m, i) => ({
                          label: m.adversaire?.slice(0, 6) ?? formatDate(m.match_date),
                          value: computePlaquagePct(m) ?? 0,
                          x: i,
                          y: 0,
                        })),
                      },
                    ]}
                    minY={0}
                    maxY={100}
                    yLabel="%"
                  />
                </div>
              )}

              {/* Tableau matchs */}
              <div className="card card-top-accent overflow-hidden">
                <div className="border-b border-fca-border px-6 py-4">
                  <h3 className="section-title">Détail des matchs</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="table-head">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-3 py-3 font-medium">Adversaire</th>
                        <th className="px-3 py-3 text-center font-medium">Essais</th>
                        <th className="px-3 py-3 text-center font-medium">Points</th>
                        <th className="px-3 py-3 text-center font-medium">Plaqs %</th>
                        <th className="px-3 py-3 text-center font-medium">Passes</th>
                        <th className="px-3 py-3 text-center font-medium">Mètres</th>
                        <th className="px-3 py-3 text-center font-medium">Min.</th>
                        {canEdit && <th className="px-3 py-3" />}
                      </tr>
                    </thead>
                    <tbody>
                      {[...matchStats].reverse().map((m) => {
                        const pts = computePoints(m);
                        const pct = computePlaquagePct(m);
                        return (
                          <tr key={m.id} className="table-row">
                            <td className="px-4 py-3 text-zinc-400">
                              {new Date(m.match_date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                              })}
                            </td>
                            <td className="px-3 py-3 font-medium text-zinc-200">
                              {m.adversaire || '—'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold text-gold">{m.essais}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold text-emerald-400">{pts}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={
                                  pct == null
                                    ? 'text-zinc-600'
                                    : pct >= 70
                                    ? 'text-emerald-400 font-semibold'
                                    : 'text-amber-400 font-semibold'
                                }
                              >
                                {pct != null ? `${pct}%` : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-zinc-300">{m.passes}</td>
                            <td className="px-3 py-3 text-center text-zinc-300">
                              {m.metres_parcourus}
                            </td>
                            <td className="px-3 py-3 text-center text-zinc-400">{m.minutes_jouees}'</td>
                            {canEdit && (
                              <td className="px-3 py-3 text-right">
                                <button
                                  onClick={() => handleDeleteMatch(m.id)}
                                  className="text-zinc-500 transition hover:text-red-500"
                                  aria-label="Supprimer"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Modal ajout match */}
          <Modal
            open={matchModal}
            title="Nouveau match"
            onClose={() => setMatchModal(false)}
            maxWidth="max-w-2xl"
          >
            <MatchForm
              initial={EMPTY_MATCH_STAT_INPUT}
              onSubmit={handleAddMatch}
              onCancel={() => setMatchModal(false)}
              saving={saving}
            />
          </Modal>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE COACH — vue de tous les joueurs
════════════════════════════════════════════════════════════════ */

export function CoachStatsTracking() {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('');

  useEffect(() => {
    if (!profile) return;
    Promise.all([listPlayers(profile.id), listMyTeams(profile.id)])
      .then(([p, t]) => {
        setPlayers(p);
        setTeams(t);
        if (t.length > 0) {
          setTeamFilter(t[0].id);
        }

        if (p.length > 0) {
          setSelectedPlayerId(p[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  const filteredPlayers = useMemo(
    () =>
      teamFilter
        ? players.filter((p) => p.teams?.some((t) => t.id === teamFilter))
        : [],
    [players, teamFilter]
  );

  const selectedPlayer = filteredPlayers.find((p) => p.id === selectedPlayerId) ?? filteredPlayers[0] ?? null;
  const activeTeam = teams.find((t) => t.id === teamFilter) ?? null;

  useEffect(() => {
    if (selectedPlayer && selectedPlayerId !== selectedPlayer.id) {
      setSelectedPlayerId(selectedPlayer.id);
    }
  }, [filteredPlayers]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          Suivi des <span className="text-gold">statistiques</span>
        </h1>
        <p className="page-subtitle">
          Évaluations et performances rugby de votre effectif.
        </p>
      </div>

      {players.length === 0 ? (
        <div className="card card-top-accent p-12 text-center text-zinc-500">
          Aucun joueur dans votre effectif.
        </div>
      ) : (
        <>
          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            {teams.length > 1 && (
              <select
                className="input sm:w-48"
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value);
                  setSelectedPlayerId(null);
                }}
              >
                <option value="" disabled>Choisir une équipe</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Sélecteur joueur */}
          <div className="card card-top-accent p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Sélectionner un joueur
            </p>
            <div className="flex flex-wrap gap-2">
              {filteredPlayers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlayerId(p.id)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    selectedPlayer?.id === p.id
                      ? 'border-brand-400/50 bg-gold-gradient text-black shadow-gold-sm'
                      : 'border-fca-border bg-fca-gray/40 text-zinc-300 hover:border-brand-400/30 hover:text-white'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      selectedPlayer?.id === p.id
                        ? 'bg-black/20 text-black'
                        : 'bg-gold-gradient text-black'
                    }`}
                  >
                    {p.prenom[0]?.toUpperCase() ?? '?'}
                  </span>
                  {fullName(p)}
                </button>
              ))}
            </div>
          </div>

          {selectedPlayer && (
            <PlayerStatsView
              player={selectedPlayer}
              teamId={activeTeam?.id ?? null}
              canEdit
              teamLabel={activeTeam?.name}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE JOUEUR — ses fiches
════════════════════════════════════════════════════════════════ */

export function PlayerStatsTracking() {
  const { profile } = useAuth();

  const [ficheViews, setFicheViews] = useState<PlayerFicheView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listMyPlayers(profile.email)
      .then((ps) => {
        const views = buildPlayerFicheViews(ps);
        setFicheViews(views);
        if (views.length > 0) setSelectedKey(views[0].key);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  const selected = ficheViews.find((v) => v.key === selectedKey) ?? ficheViews[0] ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          Mes <span className="text-gold">statistiques</span>
        </h1>
        <p className="page-subtitle">
          Suivez vos évaluations et performances match par match.
        </p>
      </div>

      {ficheViews.length === 0 ? (
        <div className="card card-top-accent p-12 text-center text-zinc-500">
          Rejoignez une équipe pour accéder à vos statistiques.
        </div>
      ) : (
        <>
          {ficheViews.length > 1 && (
            <div className="card card-top-accent p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Choisir une fiche
              </p>
              <div className="flex flex-wrap gap-2">
                {ficheViews.map((view) => (
                  <button
                    key={view.key}
                    type="button"
                    onClick={() => setSelectedKey(view.key)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition ${
                      selected?.key === view.key
                        ? 'border-brand-400/50 bg-gold-gradient text-black shadow-gold-sm'
                        : 'border-fca-border bg-fca-gray/40 text-zinc-300 hover:border-brand-400/30 hover:text-white'
                    }`}
                  >
                    <span className="block">{view.team?.name ?? 'Ma fiche'}</span>
                    {view.team && (
                      <span
                        className={`mt-0.5 block font-mono text-xs ${
                          selected?.key === view.key ? 'text-black/70' : 'text-brand-400'
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

          {selected && (
            <PlayerStatsView
              player={selected.player}
              teamId={selected.team?.id ?? null}
              canEdit={false}
              teamLabel={selected.team?.name}
            />
          )}
        </>
      )}
    </div>
  );
}
