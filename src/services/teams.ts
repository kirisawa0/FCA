import { supabase } from '@/lib/supabase';
import type { Team, TeamInput } from '@/types';
import { listMyPlayers } from '@/services/players';


export interface PlayerJoinMetadata {
  team_code?: string | null;
  nom?: string | null;
  prenom?: string | null;
}

export async function listMyTeams(coachId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Team[];
}

export async function getPrimaryTeam(coachId: string): Promise<Team | null> {
  const teams = await listMyTeams(coachId);
  return teams[0] ?? null;
}

export async function createTeam(coachId: string, input: TeamInput): Promise<Team> {
  const baseName = input.name.trim();
  const category = input.category.trim();

  if (!baseName) throw new Error('Le nom de l’équipe est obligatoire.');
  if (!category) throw new Error('La catégorie est obligatoire.');

  const fullName = `${baseName} ${category}`;

  const { data, error } = await supabase
    .from('teams')
    .insert({
      coach_id: coachId,
      name: fullName,
      category,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as Team;
}

export async function updateTeam(id: string, input: Partial<TeamInput>): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({ name: input.name?.trim() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Team;
}

export async function deleteTeam(id: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw error;
}

export async function joinTeamByCode(
  code: string,
  nom?: string,
  prenom?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('join_team_by_code', {
    p_code: code.trim(),
    p_nom: nom?.trim() ?? null,
    p_prenom: prenom?.trim() ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** Crée ou complète la fiche joueur à partir des infos d'inscription */
export async function ensurePlayerJoined(
  email: string,
  metadata?: PlayerJoinMetadata,
  fallback?: PlayerJoinMetadata
): Promise<string | null> {
  const existing = await listMyPlayers(email);
  if (existing.length > 0) return existing[0].id;

  const teamCode = (metadata?.team_code ?? fallback?.team_code)?.trim();
  if (!teamCode) return null;

  const nom = metadata?.nom ?? fallback?.nom ?? undefined;
  const prenom = metadata?.prenom ?? fallback?.prenom ?? undefined;

  const playerId = await joinTeamByCode(teamCode, nom, prenom);

  return playerId;
}

export async function getMyTeamsAsPlayer(email: string): Promise<Team[]> {
  const players = await listMyPlayers(email);
  const seen = new Set<string>();
  const teams: Team[] = [];
  for (const player of players) {
    for (const team of player.teams ?? []) {
      if (!seen.has(team.id)) {
        seen.add(team.id);
        teams.push(team);
      }
    }
  }
  return teams;
}

export async function countTeamPlayers(teamId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('player_teams')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}
