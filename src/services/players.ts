import { supabase } from '@/lib/supabase';
import type { Player, PlayerInput, Team } from '@/types';
import { isMissingTableError } from '@/lib/dbErrors';
import { seedPlayerCategoriesFromTeam } from '@/services/statCategories';

const playerSelect = '*, player_teams(team:teams(id, name, code))';

type PlayerRow = Player & {
  player_teams?: { team: Team | null }[];
  team_id?: string | null;
  team?: Team | null;
};

function mapPlayer(row: PlayerRow): Player {
  let teams =
    row.player_teams
      ?.map((pt) => pt.team)
      .filter((t): t is Team => t != null) ?? [];

  if (teams.length === 0 && row.team) {
    teams = [row.team];
  }

  const { player_teams: _pt, team: _t, team_id: _tid, ...rest } = row;
  return { ...rest, teams };
}

async function setPlayerTeams(playerId: string, teamIds: string[]): Promise<void> {
  const { error: delError } = await supabase
    .from('player_teams')
    .delete()
    .eq('player_id', playerId);
  if (delError) throw delError;

  if (teamIds.length === 0) return;

  const { error: insError } = await supabase.from('player_teams').insert(
    teamIds.map((team_id) => ({ player_id: playerId, team_id }))
  );
  if (insError) throw insError;
}

async function listPlayersWithTeams(
  coachId: string,
  teamId?: string | null
): Promise<Player[]> {
  if (teamId) {
    const { data, error } = await supabase
      .from('players')
      .select('*, player_teams!inner(team:teams(id, name, code))')
      .eq('coach_id', coachId)
      .eq('player_teams.team_id', teamId)
      .order('nom', { ascending: true });
    if (error) throw error;
    return (data as PlayerRow[]).map(mapPlayer);
  }

  const { data, error } = await supabase
    .from('players')
    .select(playerSelect)
    .eq('coach_id', coachId)
    .order('nom', { ascending: true });
  if (error) throw error;
  return (data as PlayerRow[]).map(mapPlayer);
}

/** Fallback : fiche + équipes via requêtes séparées (si jointure imbriquée indisponible) */
async function getPlayerWithTeamsSeparate(playerId: string): Promise<Player> {
  const { data: row, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (error) throw error;

  const { data: links, error: linksError } = await supabase
    .from('player_teams')
    .select('team:teams(id, name, code)')
    .eq('player_id', playerId);

  if (linksError) {
    if (isMissingTableError(linksError, 'player_teams')) {
      return getPlayerLegacy(playerId);
    }
    throw linksError;
  }

  const teams =
    (links as unknown as { team: Team | null }[] | null)
      ?.map((l) => l.team)
      .filter((t): t is Team => t != null) ?? [];

  return { ...(row as Player), teams };
}

/** Fallback si player_teams n'existe pas encore (ancien schéma avec team_id) */
async function getPlayerLegacy(playerId: string): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(id, name, code)')
    .eq('id', playerId)
    .single();
  if (error) throw error;
  return mapPlayer(data as PlayerRow);
}

/** Fallback si player_teams n'existe pas encore (ancien schéma avec team_id) */
async function listPlayersLegacy(coachId: string, teamId?: string | null): Promise<Player[]> {
  let query = supabase
    .from('players')
    .select('*, team:teams(id, name, code)')
    .eq('coach_id', coachId)
    .order('nom', { ascending: true });

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as PlayerRow[]).map(mapPlayer);
}

export async function listPlayers(
  coachId: string,
  teamId?: string | null
): Promise<Player[]> {
  try {
    return await listPlayersWithTeams(coachId, teamId);
  } catch (err) {
    if (isMissingTableError(err, 'player_teams')) {
      return listPlayersLegacy(coachId, teamId);
    }
    throw err;
  }
}

export async function getPlayer(id: string): Promise<Player> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select(playerSelect)
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapPlayer(data as PlayerRow);
  } catch (err) {
    if (isMissingTableError(err, 'player_teams')) {
      return getPlayerWithTeamsSeparate(id);
    }
    throw err;
  }
}

/** Toutes les fiches joueur liées à l'email du compte connecté */
export async function listMyPlayers(email: string): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select(playerSelect)
      .ilike('email', email)
      .order('nom', { ascending: true });
    if (error) throw error;
    return (data as PlayerRow[]).map(mapPlayer);
  } catch (err) {
    if (isMissingTableError(err, 'player_teams')) {
      const { data, error } = await supabase
        .from('players')
        .select('id')
        .ilike('email', email)
        .order('nom', { ascending: true });
      if (error) throw error;
      if (!data?.length) return [];
      return Promise.all(data.map((row) => getPlayerWithTeamsSeparate(row.id)));
    }
    throw err;
  }
}

/** Récupère la première fiche du joueur connecté via son email */
export async function getMyPlayer(email: string): Promise<Player | null> {
  const players = await listMyPlayers(email);
  return players[0] ?? null;
}

export interface PlayerFicheView {
  player: Player;
  team: Team | null;
  key: string;
}

/** Une entrée par équipe (ou une fiche sans équipe) */
export function buildPlayerFicheViews(players: Player[]): PlayerFicheView[] {
  const views: PlayerFicheView[] = [];

  for (const player of players) {
    const teams = player.teams ?? [];
    if (teams.length === 0) {
      views.push({
        player,
        team: null,
        key: `${player.id}-none`,
      });
      continue;
    }

    for (const team of teams) {
      views.push({
        player,
        team,
        key: `${player.id}-${team.id}`,
      });
    }
  }

  return views;
}

export async function createPlayer(
  coachId: string,
  input: PlayerInput
): Promise<Player> {
  const { team_ids, ...fields } = input;

  const { data, error } = await supabase
    .from('players')
    .insert({ ...fields, coach_id: coachId })
    .select('id')
    .single();
  if (error) throw error;

  const playerId = (data as { id: string }).id;
  await setPlayerTeams(playerId, team_ids);

  for (const teamId of team_ids) {
    await seedPlayerCategoriesFromTeam(playerId, teamId);
  }

  return getPlayer(playerId);
}

export async function updatePlayer(
  id: string,
  input: Partial<PlayerInput>
): Promise<Player> {
  const { team_ids, ...fields } = input;

  if (Object.keys(fields).length > 0) {
    const { error } = await supabase.from('players').update(fields).eq('id', id);
    if (error) throw error;
  }

  if (team_ids !== undefined) {
    await setPlayerTeams(id, team_ids);
  }

  return getPlayer(id);
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

/** Vérifie si les emails des fiches ont un compte Supabase (profiles) */
export async function checkPlayerAccounts(
  playerIds: string[]
): Promise<Record<string, boolean>> {
  if (playerIds.length === 0) return {};

  const { data, error } = await supabase.rpc('check_player_accounts', {
    p_player_ids: playerIds,
  });
  if (error) throw error;

  const map: Record<string, boolean> = {};
  for (const row of data as { player_id: string; has_account: boolean }[]) {
    map[row.player_id] = row.has_account;
  }
  return map;
}
