import { supabase } from '@/lib/supabase';

export interface TeamStatCategory {
  id: string;
  team_id: string;
  label: string;
  sort_order: number;
  created_at: string;
}

function normalizeLabels(labels: string[]) {
  return labels
    .map((label) => label.trim())
    .filter(Boolean)
    .filter((label, index, array) => array.indexOf(label) === index);
}

export async function listTeamStatCategories(
  teamId: string
): Promise<TeamStatCategory[]> {
  const { data, error } = await supabase
    .from('team_stat_categories')
    .select('*')
    .eq('team_id', teamId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data as TeamStatCategory[];
}

export async function replaceTeamStatCategories(
  teamId: string,
  labels: string[]
): Promise<void> {
  const cleanLabels = normalizeLabels(labels);

  const { error: deleteError } = await supabase
    .from('team_stat_categories')
    .delete()
    .eq('team_id', teamId);

  if (deleteError) throw deleteError;

  if (cleanLabels.length === 0) return;

  const rows = cleanLabels.map((label, index) => ({
    team_id: teamId,
    label,
    sort_order: index + 1,
  }));

  const { error: insertError } = await supabase
    .from('team_stat_categories')
    .insert(rows);

  if (insertError) throw insertError;
}