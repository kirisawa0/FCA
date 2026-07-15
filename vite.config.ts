import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

import { VitePWA } from 'vite-plugin-pwa';

import { resolve } from 'node:path';


/*
Electron charge les fichiers avec file://.

L'attribut crossorigin peut empêcher Electron
de charger correctement certains fichiers générés.
*/
function electronHtmlFix(): Plugin {
  return {
    name: 'electron-html-fix',

    transformIndexHtml(html) {
      return html.replace(
        /\s+crossorigin(="[^"]*")?/g,
        ''
      );
    },
  };
}


export default defineConfig(({ mode }) => {

  /*
  npm run dev
  → Electron

  npm run dev:pwa
  → PWA

  npm run build:pwa
  → PWA de production
  */
  const isPwa = mode === 'pwa';


  const desktopPlugins = [

    electronHtmlFix(),

    electron([

      /*
      Processus principal Electron
      */
      {
        entry: 'electron/main.ts',

        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },


      /*
      Script preload Electron
      */
      {
        entry: 'electron/preload.ts',

        onstart(options) {
          options.reload();
        },

        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },

    ]),

    renderer(),

  ];


  return {

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },


    plugins: [

      /*
      React est commun aux deux versions
      */
      react(),


      /*
      Version PWA
      */
      ...(isPwa

        ? [

          VitePWA({

            /*
            Met automatiquement à jour
            l'application lorsque tu publies
            une nouvelle version.
            */
            registerType: 'autoUpdate',


            /*
            Images copiées dans le cache local.
            */
            includeAssets: [

              'icons/icon-192x192.png',

              'icons/icon-512x512.png',

              'icons/icon-512x512-maskable.png',

            ],


            /*
            Informations affichées lors
            de l'installation sur téléphone.
            */
            manifest: {

              id: './',

              name: 'FCA Fiche Joueur',

              short_name: 'FCA',

              description:
                'Gestion des équipes, joueurs, évaluations et statistiques sportives.',


              theme_color: '#08080a',

              background_color: '#08080a',


              /*
              Retire les barres du navigateur
              quand l'application est installée.
              */
              display: 'standalone',


              /*
              L'application démarre depuis
              son dossier d'hébergement.
              */
              start_url: './',

              scope: './',


              orientation: 'portrait',


              icons: [

                {
                  src: 'icons/icon-192x192.png',

                  sizes: '192x192',

                  type: 'image/png',
                },


                {
                  src: 'icons/icon-512x512.png',

                  sizes: '512x512',

                  type: 'image/png',
                },


                {
                  src:
                    'icons/icon-512x512-maskable.png',

                  sizes: '512x512',

                  type: 'image/png',

                  purpose: 'maskable',
                },

              ],

            },


            /*
            Cache de l'application.

            On met en cache uniquement
            les fichiers de l'interface.

            Les réponses privées Supabase
            ne sont pas mises en cache ici.
            */
            workbox: {

              globPatterns: [

                '**/*.{js,css,html,png,svg,webp,ico,woff2}',

              ],


              cleanupOutdatedCaches: true,


              /*
              Permet aux routes React
              de revenir vers index.html.
              */
              navigateFallback: 'index.html',

            },


            /*
            Active le Service Worker
            pendant npm run dev:pwa.
            */
            devOptions: {

              enabled: true,

            },

          }),

        ]


        /*
        Version Electron
        */
        : desktopPlugins

      ),

    ],


    /*
    Compatible :
    - Electron
    - GitHub Pages
    - hébergement dans un sous-dossier
    */
    base: './',


    build: {

      outDir: 'dist',

      modulePreload: false,

    },

  };

});