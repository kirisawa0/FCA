export type UserRole = 'coach' | 'joueur';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  nom?: string | null;
  prenom?: string | null;
  date_naissance?: string | null;
  telephone?: string | null;
  bio?: string | null;
}

export interface CoachProfileInput {
  nom: string;
  prenom: string;
  date_naissance: string | null;
  telephone: string | null;
  bio: string | null;
}

export interface Team {
  id: string;
  coach_id: string;
  name: string;
  category: TeamCategory | null;
  code: string;
  created_at: string;
}

export interface TeamInput {
  name: string;
  category: TeamCategory;
}

export interface SignUpInput {
  email: string;
  password: string;
  role: UserRole;
  nom?: string;
  prenom?: string;
  teamCode?: string;
}

export interface Player {
  id: string;
  coach_id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  poste: string | null;
  telephone: string | null;
  email: string | null;
  teams?: Team[];
}

export type PlayerInput = Omit<Player, 'id' | 'coach_id' | 'teams'> & {
  team_ids: string[];
};

export interface PlayerNote {
  id: string;
  player_id: string;
  coach_id: string;
  team_id: string | null;
  note: string;
  created_at: string;
}

export const TEAM_CATEGORIES = [
  'U6',
  'U8',
  'U10',
  'U12',
  'U14',
  'U16',
  'U18/19',
  'Senior',
] as const;

export type TeamCategory = typeof TEAM_CATEGORIES[number];

export type {
  StatCategory,
  StatValue,
  StatEvaluation,
  StatEvaluationInput,
} from './stats';
export { DEFAULT_STAT_CATEGORIES, GLOBAL_NOTE_BONUS_MAX } from './stats';
