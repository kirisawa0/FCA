import { supabase } from '@/lib/supabase';
import type { StatCategory } from '@/types';

export async function listCategories(
  playerId: string,
  teamId: string
): Promise<StatCategory[]> {
  const { data, error } = await supabase
    .from('player_stat_categories')
    .select('*')
    .eq('player_id', playerId)
    .eq('team_id', teamId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return data as StatCategory[];
}

export async function seedPlayerCategoriesFromTeam(
  playerId: string,
  teamId: string
): Promise<void> {
  const { error } = await supabase.rpc('seed_player_categories_from_team', {
    p_player_id: playerId,
    p_team_id: teamId,
  });

  if (error) throw error;
}
export async function addCategory(
  playerId: string,
  teamId: string,
  label: string
): Promise<StatCategory> {
  const trimmed = label.trim();

  if (!trimmed) {
    throw new Error('Le nom de la statistique est obligatoire.');
  }

  const existing = await listCategories(playerId, teamId);

  const { data, error } = await supabase
    .from('player_stat_categories')
    .insert({
      player_id: playerId,
      team_id: teamId,
      label: trimmed,
      sort_order: existing.length + 1,
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as StatCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('player_stat_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}