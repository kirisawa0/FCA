import type { ReactNode } from 'react';

import {
  NavLink,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

import {
  resetPageUiState,
} from '@/contexts/ConfirmContext';

import { Logo } from '@/components/Logo';

import { fullName } from '@/lib/format';


interface NavItem {
  to: string;

  label: string;

  mobileLabel: string;

  icon: ReactNode;

  end?: boolean;
}


/*
|--------------------------------------------------------------------------
| Navigation du coach
|--------------------------------------------------------------------------
*/

const coachNav: NavItem[] = [

  {
    to: '/coach',

    label: 'Tableau de bord',

    mobileLabel: 'Accueil',

    end: true,

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M3 12l2-2
          m0 0 7-7 7 7
          M5 10v10
          a1 1 0 001 1h3
          m10-11 2 2
          m-2-2v10
          a1 1 0 01-1 1h-3
          m-6 0
          a1 1 0 001-1v-4
          a1 1 0 011-1h2
          a1 1 0 011 1v4
          a1 1 0 001 1
          m-6 0h6
        "
      />
    ),
  },


  {
    to: '/coach/equipe',

    label: 'Mon équipe',

    mobileLabel: 'Équipe',

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M17 20h5v-2
          a3 3 0 00-5.356-1.857
          M17 20H7
          m10 0v-2
          c0-.656-.126-1.283-.356-1.857
          M7 20H2v-2
          a3 3 0 015.356-1.857
          M7 20v-2
          c0-.656.126-1.283.356-1.857
          m0 0
          a5.002 5.002 0 019.288 0
          M15 7
          a3 3 0 11-6 0
          3 3 0 016 0z
        "
      />
    ),
  },


  {
    to: '/coach/joueurs',

    label: 'Gestion des joueurs',

    mobileLabel: 'Joueurs',

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M17 20h5v-2
          a4 4 0 00-3-3.87
          M9 20H4v-2
          a4 4 0 013-3.87
          m6-1.13
          a4 4 0 10-4-4
          4 4 0 004 4
          zm6 0
          a4 4 0 00-3-3.87
        "
      />
    ),
  },


  {
    to: '/coach/statistiques',

    label: 'Statistiques',

    mobileLabel: 'Stats',

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M9 19v-6
          a2 2 0 00-2-2H5
          a2 2 0 00-2 2v6
          a2 2 0 002 2h2
          a2 2 0 002-2
          zm0 0V9
          a2 2 0 012-2h2
          a2 2 0 012 2v10
          m-6 0
          a2 2 0 002 2h2
          a2 2 0 002-2
          m0 0V5
          a2 2 0 012-2h2
          a2 2 0 012 2v14
          a2 2 0 01-2 2h-2
          a2 2 0 01-2-2z
        "
      />
    ),
  },


  {
    to: '/coach/profil',

    label: 'Mon profil',

    mobileLabel: 'Profil',

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M16 7
          a4 4 0 11-8 0
          4 4 0 018 0z

          M12 14
          a7 7 0 00-7 7h14
          a7 7 0 00-7-7z
        "
      />
    ),
  },

];


/*
|--------------------------------------------------------------------------
| Navigation du joueur
|--------------------------------------------------------------------------
*/

const playerNav: NavItem[] = [

  {
    to: '/joueur',

    label: 'Mes fiches',

    mobileLabel: 'Fiches',

    end: true,

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M16 7
          a4 4 0 11-8 0
          4 4 0 018 0z

          M12 14
          a7 7 0 00-7 7h14
          a7 7 0 00-7-7z
        "
      />
    ),
  },


  {
    to: '/joueur/statistiques',

    label: 'Statistiques',

    mobileLabel: 'Stats',

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M9 19v-6
          a2 2 0 00-2-2H5
          a2 2 0 00-2 2v6
          a2 2 0 002 2h2
          a2 2 0 002-2

          zm0 0V9
          a2 2 0 012-2h2
          a2 2 0 012 2v10

          m-6 0
          a2 2 0 002 2h2
          a2 2 0 002-2

          m0 0V5
          a2 2 0 012-2h2
          a2 2 0 012 2v14
          a2 2 0 01-2 2h-2
          a2 2 0 01-2-2z
        "
      />
    ),
  },


  {
    to: '/joueur/profil',

    label: 'Mon profil',

    mobileLabel: 'Profil',

    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="
          M16 7
          a4 4 0 11-8 0
          4 4 0 018 0z

          M12 14
          a7 7 0 00-7 7h14
          a7 7 0 00-7-7z
        "
      />
    ),
  },

];


/*
|--------------------------------------------------------------------------
| Icône réutilisable
|--------------------------------------------------------------------------
*/

function NavigationIcon({
  children,
  className = 'h-5 w-5',
}: {
  children: ReactNode;

  className?: string;
}) {

  return (

    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >

      {children}

    </svg>

  );

}


/*
|--------------------------------------------------------------------------
| Layout principal
|--------------------------------------------------------------------------
*/

export function Layout({
  children,
}: {
  children: ReactNode;
}) {

  const {
    profile,
    signOut,
    isCoach,
  } = useAuth();


  const navigate = useNavigate();


  /*
  Liste de navigation correspondant
  au type de compte connecté.
  */

  const navigationItems =
    isCoach
      ? coachNav
      : playerNav;


  /*
  Déconnexion.
  */

  async function handleSignOut() {

    resetPageUiState();

    await signOut();

    navigate(
      '/login',
      {
        replace: true,
      }
    );

  }


  /*
  Nom affiché dans le menu.
  */

  const displayName =

    profile?.prenom &&
    profile?.nom

      ? fullName({

          prenom:
            profile.prenom,

          nom:
            profile.nom,

        })

      : profile?.email ?? '?';


  /*
  Initiales affichées dans l'avatar.
  */

  const initials =

    profile?.prenom

      ? profile.prenom
          .slice(0, 2)
          .toUpperCase()

      : (
          profile?.email ?? '?'
        )
          .slice(0, 2)
          .toUpperCase();


  /*
  Apparence des liens du menu ordinateur.
  */

  const desktopNavClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>

    `
      group

      relative

      flex

      items-center

      gap-3

      rounded-xl

      px-3

      py-2.5

      text-sm

      font-medium

      transition-all

      duration-200

      ${
        isActive

          ? `
              bg-gold-gradient

              text-black

              shadow-gold-sm
            `

          : `
              text-zinc-400

              hover:bg-fca-gray

              hover:text-brand-300
            `
      }
    `;


  /*
  Apparence des liens du menu téléphone.
  */

  const mobileNavClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>

    `
      flex

      min-w-0

      flex-col

      items-center

      justify-center

      gap-1

      rounded-xl

      px-1

      py-2

      text-[10px]

      font-semibold

      transition-all

      ${
        isActive

          ? `
              text-brand-400
            `

          : `
              text-zinc-500
            `
      }
    `;


  return (

    <div
      className="
        flex

        h-dvh

        overflow-hidden
      "
    >


      {/*
      ========================================================
      MENU ORDINATEUR

      Caché en dessous de la largeur lg.
      ========================================================
      */}

      <aside
        className="
          hidden

          h-dvh

          w-64

          shrink-0

          flex-col

          border-r

          border-fca-border

          bg-sidebar-gradient

          lg:flex
        "
      >


        <div
          className="
            relative

            flex

            flex-col

            items-center

            gap-2

            px-4

            py-7
          "
        >


          <div
            className="
              pointer-events-none

              absolute

              inset-x-6

              top-0

              h-24

              bg-[radial-gradient(ellipse_at_top,_rgba(250,204,21,0.18),_transparent_70%)]
            "
          />


          <Logo
            className="
              h-20

              w-auto

              drop-shadow-[0_0_18px_rgba(250,204,21,0.25)]
            "
          />


          <p
            className="
              text-[11px]

              font-semibold

              uppercase

              tracking-[0.25em]

              text-brand-400
            "
          >

            Fiche Joueur

          </p>


        </div>


        <div
          className="
            mx-4

            h-px

            bg-gradient-to-r

            from-transparent

            via-fca-border

            to-transparent
          "
        />


        <nav
          className="
            flex-1

            space-y-1.5

            overflow-y-auto

            px-3

            py-5
          "
        >


          {navigationItems.map(
            (item) => (

              <NavLink
                key={item.to}

                to={item.to}

                end={item.end}

                className={
                  desktopNavClass
                }
              >


                <NavigationIcon>

                  {item.icon}

                </NavigationIcon>


                {item.label}


              </NavLink>

            )
          )}


        </nav>


        {/*
        Profil utilisateur et déconnexion.
        */}

        <div
          className="
            shrink-0

            border-t

            border-fca-border

            p-3
          "
        >


          <NavLink

            to={
              isCoach

                ? '/coach/profil'

                : '/joueur/profil'
            }

            className="
              flex

              items-center

              gap-3

              rounded-xl

              bg-fca-gray/50

              px-3

              py-2.5

              transition

              hover:bg-fca-gray
            "
          >


            <div
              className="
                flex

                h-9

                w-9

                items-center

                justify-center

                rounded-full

                bg-gold-gradient

                text-sm

                font-bold

                text-black

                shadow-gold-sm
              "
            >

              {initials}

            </div>


            <div
              className="
                min-w-0

                flex-1
              "
            >


              <p
                className="
                  truncate

                  text-sm

                  font-medium

                  text-white
                "
              >

                {displayName}

              </p>


              <p
                className="
                  truncate

                  text-xs

                  text-zinc-500
                "
              >

                {profile?.email}

              </p>


            </div>


          </NavLink>


          <button

            type="button"

            onClick={
              handleSignOut
            }

            className="
              mt-2

              flex

              w-full

              items-center

              gap-3

              rounded-xl

              px-3

              py-2.5

              text-sm

              font-medium

              text-zinc-400

              transition

              hover:bg-fca-gray

              hover:text-brand-300
            "
          >


            <NavigationIcon>

              <path

                strokeLinecap="round"

                strokeLinejoin="round"

                d="
                  M17 16l4-4

                  m0 0-4-4

                  m4 4H7

                  m6 4v1

                  a3 3 0 01-3 3H6

                  a3 3 0 01-3-3V7

                  a3 3 0 013-3h4

                  a3 3 0 013 3v1
                "

              />

            </NavigationIcon>


            Déconnexion


          </button>


        </div>


      </aside>


      {/*
      ========================================================
      PARTIE PRINCIPALE

      Contient :
      - en-tête téléphone ;
      - contenu des pages ;
      - navigation téléphone.
      ========================================================
      */}

      <div
        className="
          flex

          min-w-0

          flex-1

          flex-col
        "
      >


        {/*
        ======================================================
        EN-TÊTE TÉLÉPHONE

        Caché sur ordinateur.
        ======================================================
        */}

        <header
          className="
            relative

            z-40

            flex

            h-16

            shrink-0

            items-center

            justify-between

            border-b

            border-fca-border

            bg-fca-black/95

            px-4

            backdrop-blur

            lg:hidden
          "
        >


          <div
            className="
              flex

              min-w-0

              items-center

              gap-3
            "
          >


            <Logo
              className="
                h-10

                w-auto
              "
            />


            <div
              className="
                min-w-0
              "
            >


              <p
                className="
                  truncate

                  text-sm

                  font-semibold

                  text-white
                "
              >

                FCA

              </p>


              <p
                className="
                  truncate

                  text-[10px]

                  uppercase

                  tracking-[0.16em]

                  text-brand-400
                "
              >

                Fiche Joueur

              </p>


            </div>


          </div>


          <div
            className="
              flex

              items-center

              gap-2
            "
          >


            {/*
            Accès au profil.
            */}

            <NavLink

              to={
                isCoach

                  ? '/coach/profil'

                  : '/joueur/profil'
              }

              aria-label="
                Ouvrir mon profil
              "

              className="
                flex

                h-10

                w-10

                items-center

                justify-center

                rounded-full

                bg-gold-gradient

                text-xs

                font-bold

                text-black

                shadow-gold-sm
              "
            >

              {initials}

            </NavLink>


            {/*
            Bouton de déconnexion mobile.
            */}

            <button

              type="button"

              onClick={
                handleSignOut
              }

              aria-label="
                Se déconnecter
              "

              className="
                flex

                h-10

                w-10

                items-center

                justify-center

                rounded-xl

                text-zinc-400

                transition

                hover:bg-fca-gray

                hover:text-brand-300
              "
            >


              <NavigationIcon>

                <path

                  strokeLinecap="round"

                  strokeLinejoin="round"

                  d="
                    M17 16l4-4

                    m0 0-4-4

                    m4 4H7

                    m6 4v1

                    a3 3 0 01-3 3H6

                    a3 3 0 01-3-3V7

                    a3 3 0 013-3h4

                    a3 3 0 013 3v1
                  "

                />

              </NavigationIcon>


            </button>


          </div>


        </header>


        {/*
        ======================================================
        CONTENU DES PAGES
        ======================================================
        */}

        <main
          className="
            app-bg

            min-h-0

            flex-1

            overflow-y-auto
          "
        >


          <div
            className="
              mx-auto

              max-w-6xl

              px-4

              py-4

              pb-28

              sm:px-6

              sm:py-6

              lg:px-8

              lg:py-8

              lg:pb-8
            "
          >

            {children}

          </div>


        </main>


      </div>


      {/*
      ========================================================
      NAVIGATION INFÉRIEURE TÉLÉPHONE

      Cachée sur ordinateur.
      ========================================================
      */}

      <nav
        className="
          fixed

          inset-x-0

          bottom-0

          z-50

          border-t

          border-fca-border

          bg-fca-black/95

          px-2

          pb-[env(safe-area-inset-bottom)]

          pt-1

          backdrop-blur

          lg:hidden
        "
      >


        <div
          className={`
            grid

            ${
              isCoach

                ? 'grid-cols-5'

                : 'grid-cols-3'
            }
          `}
        >


          {navigationItems.map(
            (item) => (

              <NavLink

                key={item.to}

                to={item.to}

                end={item.end}

                className={
                  mobileNavClass
                }
              >


                <NavigationIcon
                  className="
                    h-5

                    w-5
                  "
                >

                  {item.icon}

                </NavigationIcon>


                <span
                  className="
                    w-full

                    truncate

                    text-center
                  "
                >

                  {
                    item.mobileLabel
                  }

                </span>


              </NavLink>

            )
          )}


        </div>


      </nav>


    </div>

  );

}