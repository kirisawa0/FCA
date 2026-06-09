import { supabase } from '@/lib/supabase';
import type { MatchStat, MatchStatInput } from '@/types/matchStats';

export async function listMatchStats(
  playerId: string,
  teamId?: string | null
): Promise<MatchStat[]> {
  let query = supabase
    .from('player_match_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('match_date', { ascending: true });

  if (teamId) {
    query = query.or(`team_id.eq.${teamId},team_id.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as MatchStat[];
}

export async function addMatchStat(
  coachId: string,
  input: MatchStatInput
): Promise<MatchStat> {
  const { data, error } = await supabase
    .from('player_match_stats')
    .insert({ ...input, coach_id: coachId })
    .select('*')
    .single();
  if (error) throw error;
  return data as MatchStat;
}

export async function updateMatchStat(
  id: string,
  input: Partial<MatchStatInput>
): Promise<MatchStat> {
  const { data, error } = await supabase
    .from('player_match_stats')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as MatchStat;
}

export async function deleteMatchStat(id: string): Promise<void> {
  const { error } = await supabase.from('player_match_stats').delete().eq('id', id);
  if (error) throw error;
}
