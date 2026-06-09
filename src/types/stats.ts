export const DEFAULT_STAT_CATEGORIES = [
  'Technique',
  'Physique',
  'Affectif',
  'Mentales',
  'Perceptif Décisionnel',
] as const;

/** Ajustement max de la note globale au-dessus de la moyenne */
export const GLOBAL_NOTE_BONUS_MAX = 1;

export interface StatCategory {
  id: string;
  player_id: string;
  label: string;
  sort_order: number;
  created_at: string;
}

export interface StatValue {
  id: string;
  evaluation_id: string;
  category_id: string;
  valeur: number;
  category?: Pick<StatCategory, 'label'> | null;
}

export interface StatEvaluation {
  id: string;
  player_id: string;
  coach_id: string;
  team_id: string | null;
  note_globale: number;
  note_globale_ajustee: number | null;
  commentaire: string | null;
  created_at: string;
  values?: StatValue[];
}

export interface StatEvaluationInput {
  values: { category_id: string; valeur: number }[];
  note_globale_ajustee: number | null;
  commentaire: string | null;
}
