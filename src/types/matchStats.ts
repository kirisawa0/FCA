export interface MatchStat {
  id: string;
  player_id: string;
  coach_id: string;
  team_id: string | null;
  match_date: string;
  adversaire: string | null;
  essais: number;
  transformations: number;
  penalites: number;
  drops: number;
  plaquages_reussis: number;
  plaquages_manques: number;
  passes: number;
  metres_parcourus: number;
  ballons_portes: number;
  minutes_jouees: number;
  notes: string | null;
  created_at: string;
}

export type MatchStatInput = Omit<MatchStat, 'id' | 'created_at' | 'coach_id'>;

export function computePoints(m: Pick<MatchStat, 'essais' | 'transformations' | 'penalites' | 'drops'>): number {
  return m.essais * 5 + m.transformations * 2 + m.penalites * 3 + m.drops * 3;
}

export function computePlaquagePct(m: Pick<MatchStat, 'plaquages_reussis' | 'plaquages_manques'>): number | null {
  const total = m.plaquages_reussis + m.plaquages_manques;
  if (total === 0) return null;
  return Math.round((m.plaquages_reussis / total) * 100);
}

export const MATCH_STAT_LABELS: Record<keyof MatchStatInput, string> = {
  player_id: 'Joueur',
  team_id: 'Équipe',
  match_date: 'Date',
  adversaire: 'Adversaire',
  essais: 'Essais',
  transformations: 'Transformations',
  penalites: 'Pénalités',
  drops: 'Drops',
  plaquages_reussis: 'Plaquages réussis',
  plaquages_manques: 'Plaquages manqués',
  passes: 'Passes',
  metres_parcourus: 'Mètres parcourus',
  ballons_portes: 'Ballons portés',
  minutes_jouees: 'Minutes jouées',
  notes: 'Notes',
};

export const EMPTY_MATCH_STAT_INPUT: Omit<MatchStatInput, 'player_id' | 'team_id'> = {
  match_date: new Date().toISOString().slice(0, 10),
  adversaire: '',
  essais: 0,
  transformations: 0,
  penalites: 0,
  drops: 0,
  plaquages_reussis: 0,
  plaquages_manques: 0,
  passes: 0,
  metres_parcourus: 0,
  ballons_portes: 0,
  minutes_jouees: 0,
  notes: '',
};
