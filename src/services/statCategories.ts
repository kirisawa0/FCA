import { supabase } from '@/lib/supabase';
import type { StatCategory } from '@/types';
import { DEFAULT_STAT_CATEGORIES } from '@/types';

export async function listCategories(playerId: string): Promise<StatCategory[]> {
  const { data, error } = await supabase
    .from('player_stat_categories')
    .select('*')
    .eq('player_id', playerId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as StatCategory[];
}

export async function seedDefaultCategories(playerId: string): Promise<void> {
  const existing = await listCategories(playerId);
  if (existing.length > 0) return;

  const rows = DEFAULT_STAT_CATEGORIES.map((label, i) => ({
    player_id: playerId,
    label,
    sort_order: i + 1,
  }));

  const { error } = await supabase.from('player_stat_categories').insert(rows);
  if (error) {
    // Course entre deux chargements simultanés : les catégories existent déjà
    if (error.code === '23505') return;
    throw error;
  }
}

export async function addCategory(
  playerId: string,
  label: string
): Promise<StatCategory> {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Le nom de la statistique est obligatoire.');

  const existing = await listCategories(playerId);
  const { data, error } = await supabase
    .from('player_stat_categories')
    .insert({
      player_id: playerId,
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
