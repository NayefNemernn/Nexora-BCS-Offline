"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform:  process.platform,
  printHtml: (html) => ipcRenderer.invoke("print-html", html),
});
