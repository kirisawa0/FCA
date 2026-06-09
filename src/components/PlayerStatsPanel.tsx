import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { StatCategory, StatEvaluation } from '@/types';
import {
  listCategories,
  addCategory,
  deleteCategory,
  seedDefaultCategories,
} from '@/services/statCategories';
import {
  listEvaluations,
  addEvaluation,
  deleteEvaluation,
  computeAverage,
  getFinalNote,
  maxAdjustableNote,
  latestValuesByLabel,
} from '@/services/stats';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/format';
import { userFriendlyError, logDbError, isMissingStatsModuleError } from '@/lib/dbErrors';

interface Props {
  playerId: string;
  teamId?: string | null;
  canEdit: boolean;
}

export function PlayerStatsPanel({ playerId, teamId, canEdit }: Props) {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<StatCategory[]>([]);
  const [evaluations, setEvaluations] = useState<StatEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [evalModal, setEvalModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const [formValues, setFormValues] = useState<Record<string, number>>({});
  const [adjustGlobal, setAdjustGlobal] = useState(false);
  const [globalAdjusted, setGlobalAdjusted] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [loadError, setLoadError] = useState<'migration' | string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      await seedDefaultCategories(playerId);
      const [cats, evals] = await Promise.all([
        listCategories(playerId),
        listEvaluations(playerId, teamId),
      ]);
      setCategories(cats);
      setEvaluations(evals);
    } catch (err) {
      logDbError('PlayerStatsPanel', err);
      setLoadError(isMissingStatsModuleError(err) ? 'migration' : userFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, teamId]);

  const latest = evaluations[0] ?? null;
  const latestByLabel = latestValuesByLabel(evaluations);

  const formAverage = useMemo(
    () => computeAverage(Object.values(formValues)),
    [formValues]
  );
  const formMaxAdjust = maxAdjustableNote(formAverage);

  function openEvalModal() {
    const init: Record<string, number> = {};
    for (const c of categories) init[c.id] = 5;
    setFormValues(init);
    setAdjustGlobal(false);
    setGlobalAdjusted(5);
    setCommentaire('');
    setEvalModal(true);
  }

  function updateFormValue(catId: string, val: number) {
    setFormValues((prev) => {
      const next = { ...prev, [catId]: val };
      const avg = computeAverage(Object.values(next));
      if (!adjustGlobal) setGlobalAdjusted(avg);
      return next;
    });
  }

  async function handleAddEvaluation(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const created = await addEvaluation(
        playerId,
        profile.id,
        {
          values: categories.map((c) => ({
            category_id: c.id,
            valeur: formValues[c.id] ?? 0,
          })),
          note_globale_ajustee: adjustGlobal ? globalAdjusted : null,
          commentaire: commentaire.trim() || null,
        },
        teamId
      );
      setEvaluations((prev) => [created, ...prev]);
      setEvalModal(false);
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvaluation(id: string) {
    if (!(await confirm('Supprimer cette évaluation ?'))) return;
    await deleteEvaluation(id);
    setEvaluations((prev) => prev.filter((ev) => ev.id !== id));
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    setSaving(true);
    try {
      const created = await addCategory(playerId, newCatLabel);
      setCategories((prev) => [...prev, created]);
      setNewCatLabel('');
    } catch (err: any) {
      alert(err?.message ?? 'Impossible d’ajouter la statistique.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!(await confirm('Supprimer cette statistique ? Les anciennes évaluations perdront cette colonne.'))) return;
    await deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (loadError === 'migration') {
    return (
      <section className="card card-top-accent border-amber-900/40 p-6">
        <h3 className="section-title text-amber-300">Statistiques indisponibles</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Le module statistiques n&apos;est pas encore activé pour votre club.
          Contactez l&apos;administrateur de l&apos;application pour finaliser la configuration.
        </p>
        <button type="button" className="btn-secondary mt-4" onClick={() => load()}>
          Réessayer
        </button>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="card card-top-accent border-red-900/40 p-6">
        <p className="text-sm text-red-400">{loadError}</p>
        <button type="button" className="btn-secondary mt-4" onClick={() => load()}>
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Statistiques</h3>
        {canEdit && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setCatModal(true)}>
              Gérer les stats
            </button>
            <button
              className="btn-primary"
              onClick={openEvalModal}
              disabled={categories.length === 0}
            >
              + Nouvelle évaluation
            </button>
          </div>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="card card-top-accent p-8 text-center text-zinc-500">
          Aucune statistique configurée.
          {canEdit && (
            <button className="btn-primary mt-4 inline-flex" onClick={() => setCatModal(true)}>
              Configurer les stats
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <StatCard
                key={c.id}
                label={c.label}
                value={latestByLabel[c.label] ?? '—'}
                accent="text-gold"
                hint={latest ? 'Dernière éval.' : undefined}
              />
            ))}
            <StatCard
              label="Note globale"
              value={latest ? getFinalNote(latest).toFixed(1) : '—'}
              accent="text-white"
              hint={
                latest?.note_globale_ajustee != null
                  ? `Moyenne : ${latest.note_globale}/10`
                  : undefined
              }
            />
          </div>

          <section className="card card-top-accent">
            <div className="border-b border-fca-border px-6 py-4">
              <h3 className="section-title">Historique des évaluations</h3>
            </div>
            {evaluations.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">
                Aucune évaluation enregistrée.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="px-6 py-3 font-medium">Date</th>
                      {categories.map((c) => (
                        <th key={c.id} className="px-3 py-3 font-medium text-center">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-3 font-medium text-center">Globale</th>
                      <th className="px-3 py-3 font-medium">Commentaire</th>
                      {canEdit && <th className="px-3 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.map((ev) => {
                      const valMap = Object.fromEntries(
                        (ev.values ?? []).map((v) => [v.category_id, v.valeur])
                      );
                      return (
                        <tr key={ev.id} className="table-row">
                          <td className="px-6 py-3 text-zinc-400">
                            {formatDate(ev.created_at)}
                          </td>
                          {categories.map((c) => (
                            <td
                              key={c.id}
                              className="px-3 py-3 text-center font-semibold text-brand-400"
                            >
                              {valMap[c.id] != null ? valMap[c.id] : '—'}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-center font-bold text-white">
                            {getFinalNote(ev).toFixed(1)}
                            {ev.note_globale_ajustee != null && (
                              <span className="ml-1 text-xs text-zinc-500">
                                ({ev.note_globale})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-zinc-400">
                            {ev.commentaire ?? '—'}
                          </td>
                          {canEdit && (
                            <td className="px-3 py-3 text-right">
                              <button
                                onClick={() => handleDeleteEvaluation(ev.id)}
                                className="text-zinc-500 transition hover:text-red-500"
                                aria-label="Supprimer"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            )}
          </section>
        </>
      )}

      {/* Modal évaluation */}
      <Modal
        open={evalModal}
        title="Nouvelle évaluation"
        onClose={() => setEvalModal(false)}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAddEvaluation} className="space-y-5">
          <div className="space-y-4">
            {categories.map((c) => (
              <NoteSlider
                key={c.id}
                label={c.label}
                value={formValues[c.id] ?? 5}
                onChange={(v) => updateFormValue(c.id, v)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-fca-border bg-fca-gray/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Moyenne calculée</p>
                <p className="text-2xl font-bold text-gold">{formAverage.toFixed(1)}/10</p>
              </div>
              {canEdit && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={adjustGlobal}
                    onChange={(e) => {
                      setAdjustGlobal(e.target.checked);
                      if (e.target.checked) setGlobalAdjusted(formMaxAdjust);
                    }}
                    className="accent-brand-400"
                  />
                  Ajuster légèrement la note globale
                </label>
              )}
            </div>
            {adjustGlobal && (
              <div className="mt-3">
                <NoteSlider
                  label="Note globale ajustée"
                  value={globalAdjusted}
                  min={formAverage}
                  max={formMaxAdjust}
                  step={0.1}
                  onChange={setGlobalAdjusted}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Vous pouvez augmenter jusqu’à +1 point par rapport à la moyenne.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Commentaire (optionnel)</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setEvalModal(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal gestion catégories */}
      <Modal
        open={catModal}
        title="Gérer les statistiques"
        onClose={() => setCatModal(false)}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Ajoutez ou supprimez les critères d&apos;évaluation pour ce joueur.
          </p>

          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-fca-border bg-fca-gray/40 px-4 py-2.5"
              >
                <span className="font-medium text-zinc-200">{c.label}</span>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-zinc-500 transition hover:text-red-500"
                    aria-label="Supprimer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>

          {canEdit && (
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                className="input"
                placeholder="Nouvelle statistique…"
                value={newCatLabel}
                onChange={(e) => setNewCatLabel(e.target.value)}
              />
              <button type="submit" className="btn-primary shrink-0" disabled={saving}>
                Ajouter
              </button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

function NoteSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <span className="text-lg font-bold text-brand-400">{value.toFixed(1)}/10</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        className="w-full accent-brand-400"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
