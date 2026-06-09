# FCA Fiche Joueur

Application **desktop** (Windows & macOS) de gestion des fiches joueurs pour un club sportif.
Construite avec **Electron + React + Vite + TypeScript + Tailwind CSS** et **Supabase** (Auth + base de données PostgreSQL).

## Fonctionnalités

Deux rôles avec des accès distincts (sécurisés par Row Level Security côté Supabase) :

### Coach

- Voir la liste de ses joueurs
- Créer / modifier / supprimer un joueur
- Ajouter des commentaires
- Ajouter des statistiques (par match)
- Voir les fiches complètes des joueurs

### Joueur

- Voir uniquement sa fiche
- Voir ses statistiques
- Voir les commentaires du coach

## Architecture

```
fca-fiche-joueur/
├── electron/              # Processus principal Electron + preload
│   ├── main.ts
│   └── preload.ts
├── supabase/
│   └── schema.sql         # Tables, triggers et politiques RLS
├── src/
│   ├── components/        # Composants réutilisables (Layout, formulaires, UI)
│   ├── contexts/          # AuthContext (session + profil + rôle)
│   ├── lib/               # Client Supabase + utilitaires
│   ├── pages/             # Login, Dashboards, Gestion, Fiche
│   ├── services/          # Accès données (players, comments, stats)
│   ├── types/             # Types TypeScript partagés
│   ├── App.tsx            # Routeur + routes protégées
│   └── main.tsx
├── index.html
├── vite.config.ts         # Vite + plugins Electron
├── tailwind.config.js
└── package.json
```

## Prérequis

- Node.js 18+ (testé avec Node 22)
- Un projet Supabase (gratuit) : https://supabase.com

## 1. Configuration de Supabase

1. Créez un projet sur Supabase.
2. Ouvrez **SQL Editor** et exécutez le contenu de [`supabase/schema.sql`](supabase/schema.sql).
   Cela crée les tables (`profiles`, `players`, `comments`, `stats`), les triggers et les politiques de sécurité (RLS).
3. Dans **Project Settings > API**, récupérez :
   - `Project URL`
   - `anon public key`

### Créer les utilisateurs

Dans **Authentication > Users**, ajoutez les comptes (email + mot de passe).
Pour définir le rôle, ajoutez dans les **User Metadata** (`raw_user_meta_data`) :

```json
{ "full_name": "Jean Dupont", "role": "coach" }
```

> Le rôle peut être `coach` ou `player`. Sans métadonnée, le rôle par défaut est `player`.
> Vous pouvez aussi modifier le rôle directement dans la table `profiles`.

Pour lier le **compte d'un joueur** à sa fiche : copiez l'`UUID` du compte (Authentication > Users)
et renseignez-le dans le champ « Compte joueur » lors de la création/modification de la fiche.

## 2. Configuration locale

```bash
# Installer les dépendances
npm install

# Copier le modèle d'environnement et le remplir
copy .env.example .env      # Windows
# cp .env.example .env      # macOS / Linux
```

Renseignez `.env` :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

## 3. Lancer en développement

```bash
npm run dev
```

Vite démarre et Electron ouvre automatiquement la fenêtre de l'application.

## 4. Générer les exécutables

```bash
npm run dist:win    # Installateur Windows (.exe / NSIS)
npm run dist:mac    # Image macOS (.dmg)
npm run dist        # Plateforme courante
```

Les fichiers sont produits dans le dossier `release/`.

## Scripts disponibles

| Script             | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Lance l'app en développement (Vite+Electron) |
| `npm run build`    | Vérifie les types et build le renderer       |
| `npm run dist`     | Build + package l'app pour la plateforme      |
| `npm run dist:win` | Package pour Windows                          |
| `npm run dist:mac` | Package pour macOS                            |
| `npm run lint`     | Analyse statique ESLint                       |

## Sécurité

- L'isolation du contexte Electron est activée (`contextIsolation: true`, `nodeIntegration: false`).
- Les accès aux données sont protégés par les politiques **RLS** de Supabase : un joueur ne peut
  jamais lire la fiche d'un autre joueur, et seules les opérations autorisées par rôle passent.
