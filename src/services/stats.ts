import { supabase } from '@/lib/supabase';
import { isMissingTeamIdColumnError } from '@/lib/dbErrors';
import type { StatEvaluation, StatEvaluationInput } from '@/types';
import { GLOBAL_NOTE_BONUS_MAX } from '@/types';

export function computeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, v) => a + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function getFinalNote(evaluation: StatEvaluation): number {
  return evaluation.note_globale_ajustee ?? evaluation.note_globale;
}

export function maxAdjustableNote(average: number): number {
  return Math.min(10, Math.round((average + GLOBAL_NOTE_BONUS_MAX) * 10) / 10);
}

function teamEvalFilter(teamId?: string | null) {
  if (!teamId) return undefined;
  return `team_id.eq.${teamId},team_id.is.null`;
}

async function listEvaluationsQuery(
  playerId: string,
  teamId?: string | null
): Promise<StatEvaluation[]> {
  let query = supabase
    .from('player_stat_evaluations')
    .select(
      `
      *,
      values:player_stat_values(
        *,
        category:player_stat_categories(label)
      )
    `
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  const teamFilter = teamEvalFilter(teamId);
  if (teamFilter) {
    query = query.or(teamFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as StatEvaluation[];
}

export async function listEvaluations(
  playerId: string,
  teamId?: string | null
): Promise<StatEvaluation[]> {
  try {
    return await listEvaluationsQuery(playerId, teamId);
  } catch (err) {
    if (teamId && isMissingTeamIdColumnError(err)) {
      return listEvaluationsQuery(playerId, null);
    }
    throw err;
  }
}

export async function addEvaluation(
  playerId: string,
  coachId: string,
  input: StatEvaluationInput,
  teamId?: string | null
): Promise<StatEvaluation> {
  const valeurs = input.values.map((v) => v.valeur);
  const note_globale = computeAverage(valeurs);

  let note_globale_ajustee: number | null = input.note_globale_ajustee;
  if (note_globale_ajustee != null) {
    const max = maxAdjustableNote(note_globale);
    if (note_globale_ajustee < note_globale) {
      note_globale_ajustee = note_globale;
    }
    if (note_globale_ajustee > max) {
      note_globale_ajustee = max;
    }
    if (Math.abs(note_globale_ajustee - note_globale) < 0.05) {
      note_globale_ajustee = null;
    }
  }

  const insertPayload = {
    player_id: playerId,
    coach_id: coachId,
    team_id: teamId ?? null,
    note_globale,
    note_globale_ajustee,
    commentaire: input.commentaire,
  };

  let evaluation: Record<string, unknown>;
  const { data: evalWithTeam, error: evalError } = await supabase
    .from('player_stat_evaluations')
    .insert(insertPayload)
    .select('*')
    .single();

  if (evalError && teamId && isMissingTeamIdColumnError(evalError)) {
    const { team_id: _t, ...withoutTeam } = insertPayload;
    const { data: evalLegacy, error: legacyError } = await supabase
      .from('player_stat_evaluations')
      .insert(withoutTeam)
      .select('*')
      .single();
    if (legacyError) throw legacyError;
    evaluation = evalLegacy as Record<string, unknown>;
  } else if (evalError) {
    throw evalError;
  } else {
    evaluation = evalWithTeam as Record<string, unknown>;
  }

  const valueRows = input.values.map((v) => ({
    evaluation_id: evaluation.id as string,
    category_id: v.category_id,
    valeur: v.valeur,
  }));

  const { data: values, error: valError } = await supabase
    .from('player_stat_values')
    .insert(valueRows)
    .select('*, category:player_stat_categories(label)');
  if (valError) throw valError;

  return {
    ...(evaluation as unknown as StatEvaluation),
    values: values as StatEvaluation['values'],
  };
}

export async function deleteEvaluation(id: string): Promise<void> {
  const { error } = await supabase
    .from('player_stat_evaluations')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Dernière évaluation avec valeurs par label */
export function latestValuesByLabel(
  evaluations: StatEvaluation[]
): Record<string, number> {
  const latest = evaluations[0];
  if (!latest?.values) return {};
  const map: Record<string, number> = {};
  for (const v of latest.values) {
    const label = v.category?.label;
    if (label) map[label] = v.valeur;
  }
  return map;
}
