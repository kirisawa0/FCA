import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'node:path';

/** Electron charge les fichiers en file:// — l'attribut crossorigin bloque les scripts. */
function electronHtmlFix(): Plugin {
  return {
    name: 'electron-html-fix',
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(="[^"]*")?/g, '');
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    electronHtmlFix(),
    electron([
      {
        // Processus principal Electron
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
             rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
              },
            },
          },
        },
      },
      {
        // Script de preload
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
  ],
  base: './',
  build: {
    outDir: 'dist',
    modulePreload: false,
  },
});
