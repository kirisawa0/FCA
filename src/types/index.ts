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
  code: string;
  created_at: string;
}

export type TeamInput = Pick<Team, 'name'>;

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

export type {
  StatCategory,
  StatValue,
  StatEvaluation,
  StatEvaluationInput,
} from './stats';
export { DEFAULT_STAT_CATEGORIES, GLOBAL_NOTE_BONUS_MAX } from './stats';
