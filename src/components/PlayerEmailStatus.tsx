interface Props {
  email: string | null;
  hasAccount?: boolean;
}

/** Affiche l'email ou « Utilisateur introuvable » si pas encore de compte joueur */
export function PlayerEmailStatus({ email, hasAccount }: Props) {
  if (!email) {
    return <span className="text-zinc-500">—</span>;
  }

  if (hasAccount === false) {
    return (
      <span className="font-medium text-amber-400" title={`Email fiche : ${email}`}>
        Utilisateur introuvable
      </span>
    );
  }

  if (hasAccount === true) {
    return (
      <span className="text-zinc-300" title="Compte joueur actif">
        {email}
      </span>
    );
  }

  return <span className="text-zinc-400">{email}</span>;
}
