"use strict";
// Minimal preload — contextBridge can expose safe APIs here if needed later.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
});
