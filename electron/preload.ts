import { contextBridge } from 'electron';

// API minimale et sécurisée exposée au renderer.
// On garde l'isolation du contexte activée et on n'expose que le strict nécessaire.
contextBridge.exposeInMainWorld('app', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
