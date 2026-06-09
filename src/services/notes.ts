import { supabase } from '@/lib/supabase';
import { isMissingTeamIdColumnError } from '@/lib/dbErrors';
import type { PlayerNote } from '@/types';

function teamNotesFilter(teamId?: string | null) {
  if (!teamId) return undefined;
  return `team_id.eq.${teamId},team_id.is.null`;
}

async function listNotesQuery(
  playerId: string,
  teamId?: string | null
): Promise<PlayerNote[]> {
  let query = supabase
    .from('player_notes')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  const teamFilter = teamNotesFilter(teamId);
  if (teamFilter) {
    query = query.or(teamFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as PlayerNote[];
}

export async function listNotes(
  playerId: string,
  teamId?: string | null
): Promise<PlayerNote[]> {
  try {
    return await listNotesQuery(playerId, teamId);
  } catch (err) {
    if (teamId && isMissingTeamIdColumnError(err)) {
      return listNotesQuery(playerId, null);
    }
    throw err;
  }
}

export async function addNote(
  playerId: string,
  coachId: string,
  note: string,
  teamId?: string | null
): Promise<PlayerNote> {
  const payload = {
    player_id: playerId,
    coach_id: coachId,
    note,
    team_id: teamId ?? null,
  };

  const { data, error } = await supabase
    .from('player_notes')
    .insert(payload)
    .select('*')
    .single();

  if (error && teamId && isMissingTeamIdColumnError(error)) {
    const { team_id: _t, ...withoutTeam } = payload;
    const { data: legacy, error: legacyError } = await supabase
      .from('player_notes')
      .insert(withoutTeam)
      .select('*')
      .single();
    if (legacyError) throw legacyError;
    return legacy as PlayerNote;
  }

  if (error) throw error;
  return data as PlayerNote;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('player_notes').delete().eq('id', id);
  if (error) throw error;
}
