import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resetPageUiState } from '@/contexts/ConfirmContext';
import { Logo } from '@/components/Logo';
import { fullName } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const coachNav: NavItem[] = [
  {
    to: '/coach',
    label: 'Tableau de bord',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    to: '/coach/equipe',
    label: 'Mon équipe',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    ),
  },
  {
    to: '/coach/joueurs',
    label: 'Gestion des joueurs',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-3.87" />
    ),
  },
  {
    to: '/coach/statistiques',
    label: 'Statistiques',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
  },
  {
    to: '/coach/profil',
    label: 'Mon profil',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut, isCoach } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    resetPageUiState();
    await signOut();
    navigate('/login', { replace: true });
  }

  const displayName =
    profile?.prenom && profile?.nom
      ? fullName({ prenom: profile.prenom, nom: profile.nom })
      : profile?.email ?? '?';
  const initials = profile?.prenom
    ? profile.prenom.slice(0, 2).toUpperCase()
    : (profile?.email ?? '?').slice(0, 2).toUpperCase();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-gold-gradient text-black shadow-gold-sm'
        : 'text-zinc-400 hover:bg-fca-gray hover:text-brand-300'
    }`;

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-64 flex-col border-r border-fca-border bg-sidebar-gradient">
        <div className="relative flex flex-col items-center gap-2 px-4 py-7">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-24 bg-[radial-gradient(ellipse_at_top,_rgba(250,204,21,0.18),_transparent_70%)]" />
          <Logo className="h-20 w-auto drop-shadow-[0_0_18px_rgba(250,204,21,0.25)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-400">
            Fiche Joueur
          </p>
        </div>

        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-fca-border to-transparent" />

        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {isCoach &&
            coachNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/coach'} className={navClass}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {item.icon}
                </svg>
                {item.label}
              </NavLink>
            ))}
          {!isCoach && (
            <>
              <NavLink to="/joueur" end className={navClass}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Mes fiches
              </NavLink>
              <NavLink to="/joueur/statistiques" className={navClass}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Statistiques
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-fca-border p-3">
          <NavLink
            to={isCoach ? '/coach/profil' : '/joueur'}
            className="flex items-center gap-3 rounded-xl bg-fca-gray/50 px-3 py-2.5 transition hover:bg-fca-gray"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-sm font-bold text-black shadow-gold-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{profile?.email}</p>
            </div>
          </NavLink>
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-fca-gray hover:text-brand-300"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="app-bg flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
