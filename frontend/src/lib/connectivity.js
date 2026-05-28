// In Electron the local backend is always reachable — navigator.onLine only
// reflects internet connectivity, which is irrelevant for the desktop app.
const IS_ELECTRON = Boolean(window.electronAPI);

export const isOnline = () => IS_ELECTRON || navigator.onLine;
