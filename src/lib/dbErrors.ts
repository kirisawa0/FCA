/** Erreurs Supabase liées au schéma SQL non migré */
export function isMissingTableError(err: unknown, table?: string): boolean {
  const msg = ((err as { message?: string })?.message ?? '').toLowerCase();
  if (
    !msg.includes('schema cache') &&
    !msg.includes('does not exist') &&
    !msg.includes('manquante') &&
    !msg.includes('could not find a relationship')
  ) {
    return false;
  }
  if (table) return msg.includes(table.toLowerCase());
  return true;
}

export function dbErrorMessage(err: unknown): string {
  return (err as { message?: string })?.message ?? 'Erreur inconnue';
}

/** Colonne team_id absente (migration notes par équipe non appliquée) */
export function isMissingTeamIdColumnError(err: unknown): boolean {
  const msg = dbErrorMessage(err).toLowerCase();
  return (
    msg.includes('team_id') &&
    (msg.includes('schema cache') ||
      msg.includes('does not exist') ||
      msg.includes('column') ||
      msg.includes('could not find'))
  );
}

/** Tables du module statistiques v2 réellement absentes */
export function isMissingStatsModuleError(err: unknown): boolean {
  const msg = dbErrorMessage(err).toLowerCase();
  if (isMissingTeamIdColumnError(err)) return false;
  return (
    msg.includes('player_stat_categories') ||
    msg.includes('player_stat_evaluations') ||
    msg.includes('player_stat_values') ||
    (msg.includes('does not exist') && msg.includes('player_stat'))
  );
}

/** Message technique pour les logs développeur (console) */
export function migrationHint(err: unknown): string | null {
  const msg = dbErrorMessage(err).toLowerCase();
  if (msg.includes('teams') && !msg.includes('player_teams')) {
    return 'Migration requise : supabase/migration_teams.sql';
  }
  if (msg.includes('player_teams')) {
    return 'Migration requise : supabase/migration_player_teams.sql';
  }
  if (msg.includes('player_stat_categories')) {
    return 'Migration requise : supabase/migration_stats_v2.sql';
  }
  if (isMissingTeamIdColumnError(err)) {
    return 'Migration requise : supabase/migration_notes_per_team.sql';
  }
  if (
    msg.includes('profiles') &&
    (msg.includes('nom') || msg.includes('prenom') || msg.includes('date_naissance'))
  ) {
    return 'Migration requise : supabase/migration_coach_profile.sql';
  }
  return null;
}

/**
 * Message affiché à l'utilisateur (coach / joueur) — sans jargon technique.
 */
export function userFriendlyError(err: unknown): string {
  const msg = dbErrorMessage(err).toLowerCase();

  if (msg.includes('player_teams') || msg.includes('manquante')) {
    return 'L’association joueur / équipe n’est pas encore active. Contactez l’administrateur du club.';
  }

  if (isMissingStatsModuleError(err)) {
    return 'Le module statistiques n’est pas encore disponible. Contactez l’administrateur du club.';
  }

  if (isMissingTeamIdColumnError(err)) {
    return 'Une mise à jour de la base de données est nécessaire (notes par équipe). Contactez l’administrateur du club.';
  }

  if (
    msg.includes('teams') &&
    (msg.includes('schema cache') || msg.includes('does not exist'))
  ) {
    return 'La gestion des équipes n’est pas encore disponible. Contactez l’administrateur du club.';
  }

  if (
    msg.includes('check_player_accounts') ||
    (msg.includes('schema cache') && msg.includes('function'))
  ) {
    return 'Impossible de vérifier le statut des comptes joueurs. Contactez l’administrateur du club.';
  }

  if (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('public.')
  ) {
    return 'Une mise à jour de la plateforme est nécessaire. Contactez l’administrateur du club.';
  }

  const raw = dbErrorMessage(err);

  if (
    raw.includes('Invalid login credentials') ||
    raw.toLowerCase().includes('invalid login')
  ) {
    return 'Email ou mot de passe incorrect.';
  }

  if (raw.length > 140 || raw.includes('SQL') || raw.includes('supabase/')) {
    return 'Une erreur est survenue. Veuillez réessayer ou contacter l’administrateur du club.';
  }

  return raw;
}

/** Log console pour le développeur + message utilisateur */
export function logDbError(context: string, err: unknown): void {
  const hint = migrationHint(err);
  console.error(`[${context}]`, dbErrorMessage(err), hint ?? '');
}
