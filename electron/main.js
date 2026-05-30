"use strict";

const { app, BrowserWindow, shell, dialog, utilityProcess, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const http = require("http");
const fs   = require("fs");

const IS_DEV = !app.isPackaged;

// ── Auto-updater (packaged builds only) ─────────────────────────────────────
let autoUpdater = null;
if (!IS_DEV) {
  try {
    autoUpdater = require("electron-updater").autoUpdater;
    autoUpdater.autoDownload    = true;   // download silently in background
    autoUpdater.autoInstallOnAppQuit = true; // install on next quit
    autoUpdater.logger = null;            // silence update logs in production
  } catch { autoUpdater = null; }
}

function checkForUpdates() {
  if (!autoUpdater) return;
  autoUpdater.checkForUpdates().catch(() => {}); // silent — no internet is fine

  autoUpdater.on("update-available", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-available", info.version);
    }
  });

  autoUpdater.on("update-downloaded", () => {
    const choice = dialog.showMessageBoxSync({
      type:    "info",
      title:   "Update Ready",
      message: "A new version of Nexora POS has been downloaded.",
      detail:  "Restart now to apply the update, or install it next time you close the app.",
      buttons: ["Restart Now", "Later"],
    });
    if (choice === 0) autoUpdater.quitAndInstall();
  });
}

// Lock the userData path to a fixed name so it never changes when productName
// or version changes — this keeps the database across all future updates.
app.setPath("userData", path.join(app.getPath("appData"), "nexora-pos"));

// Directories that live inside the user's data folder (survives updates)
const userData     = app.getPath("userData");
const mongoDataDir = path.join(userData, "mongodb-data");
const uploadsDir   = path.join(userData, "uploads");

// Ensure required directories exist
fs.mkdirSync(mongoDataDir, { recursive: true });
fs.mkdirSync(uploadsDir,   { recursive: true });

let mongoServer    = null;
let backendProcess = null;
let mainWindow     = null;
const BACKEND_PORT = 5000;

// ── 1. Start an embedded MongoDB with a persistent dbPath ────────────────────
async function startMongoDB() {
  const { MongoMemoryServer } = require("mongodb-memory-server");

  // In packaged mode, use the bundled mongod binary — fully offline, no download needed.
  // In dev mode, MongoMemoryServer auto-downloads and caches the binary.
  if (!IS_DEV) {
    const binName    = process.platform === "win32" ? "mongod.exe" : "mongod";
    const bundledBin = path.join(process.resourcesPath, "mongodb-binary", binName);
    if (fs.existsSync(bundledBin)) {
      // Make sure it is executable on Linux/Mac (it may lose the bit after extraction)
      if (process.platform !== "win32") {
        try { fs.chmodSync(bundledBin, 0o755); } catch {}
      }
      process.env.MONGOMS_SYSTEM_BINARY = bundledBin;
    }
  }

  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbPath:        mongoDataDir,
      storageEngine: "wiredTiger",
    },
    binary: {
      // Cache dir for dev-mode auto-downloads; ignored when MONGOMS_SYSTEM_BINARY is set
      downloadDir: path.join(userData, "mongodb-binary"),
    },
  });

  return mongoServer.getUri();
}

// ── 2. Start the Express backend ─────────────────────────────────────────────
// Uses Electron's built-in Node.js (utilityProcess) so no external Node
// installation is required on the user's machine.
function startBackend(mongoUri) {
  const backendDir = IS_DEV
    ? path.join(__dirname, "..", "backend")
    : path.join(process.resourcesPath, "backend");

  const frontendDist = IS_DEV
    ? path.join(__dirname, "..", "frontend", "dist")
    : path.join(process.resourcesPath, "frontend-dist");

  const env = {
    ...process.env,
    MONGO_URI:      mongoUri,
    PORT:           String(BACKEND_PORT),
    JWT_SECRET:     process.env.JWT_SECRET || "nexora-desktop-offline-secret",
    NODE_ENV:       "production",
    ELECTRON_RUN:   "true",
    UPLOADS_DIR:    uploadsDir,
    FRONTEND_DIST:  frontendDist,
  };

  // utilityProcess.fork uses Electron's own Node runtime — no system Node needed
  backendProcess = utilityProcess.fork(
    path.join(backendDir, "src", "server.js"),
    [],
    {
      env,
      cwd:         backendDir,
      serviceName: "nexora-backend",
      stdio:       IS_DEV ? "inherit" : "pipe",
    }
  );

  backendProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      dialog.showErrorBox(
        "Backend crashed",
        `Server exited with code ${code}.\nPlease restart the application.`
      );
    }
  });
}

// ── 3. Poll until the backend HTTP server is ready ───────────────────────────
function waitForBackend(maxMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(`http://localhost:${BACKEND_PORT}/`, () => {
        resolve();
      }).on("error", () => {
        if (Date.now() - start > maxMs) {
          reject(new Error("Backend did not start within 60 seconds"));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

// ── 4. Create the main browser window ───────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:     1400,
    height:    900,
    minWidth:  1024,
    minHeight: 700,
    title:     "Nexora POS",
    webPreferences: {
      preload:          path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.loadURL(`http://localhost:${BACKEND_PORT}`);

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (IS_DEV) mainWindow.webContents.openDevTools({ mode: "detach" });

  // Check for updates 10 seconds after launch so startup isn't delayed
  setTimeout(() => checkForUpdates(), 10_000);
}

// ── Receipt printing via Chromium print engine ────────────────────────────────
// Opens a hidden BrowserWindow with the receipt HTML, shows Chromium's built-in
// print dialog (has preview + all CUPS printers), then closes the window.
ipcMain.handle("print-html", (_event, html) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show:   false,
      width:  400,
      height: 600,
      webPreferences: { contextIsolation: true },
    });

    printWin.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    );

    printWin.webContents.once("did-finish-load", () => {
      printWin.webContents.print(
        { silent: false, printBackground: true, color: false },
        (success) => {
          printWin.destroy();
          resolve(success);
        }
      );
    });

    // Safety: if the window is closed by the user before printing
    printWin.on("closed", () => resolve(false));
  });
});

// ── IPC: open native file picker for .nexora files (called from renderer) ────
ipcMain.handle("pick-nexora-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title:       "Select License File",
    buttonLabel: "Activate",
    filters:     [{ name: "Nexora License", extensions: ["nexora"] }],
    properties:  ["openFile"],
  });
  if (result.canceled || !result.filePaths.length) return null;
  return fs.readFileSync(result.filePaths[0], "utf8");
});

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const splashHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;
       display:flex;flex-direction:column;align-items:center;
       justify-content:center;height:100vh;gap:12px}
  h1{font-size:22px;font-weight:700}
  p{font-size:13px;color:#94a3b8}
  .dot{width:8px;height:8px;border-radius:50%;background:#38bdf8;
       animation:blink 1s infinite;display:inline-block;margin:0 2px}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
</style></head>
<body>
  <h1>Nexora POS</h1>
  <p>Starting database &amp; server… <span class="dot"></span></p>
</body></html>`;

  // Show splash
  mainWindow = new BrowserWindow({
    width: 480, height: 240,
    frame: false, resizable: false,
    webPreferences: { contextIsolation: true },
  });
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  try {
    const mongoUri = await startMongoDB();
    startBackend(mongoUri);
    await waitForBackend();
    mainWindow.close();
    createWindow();
  } catch (err) {
    dialog.showErrorBox("Startup failed", err.message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (mongoServer) {
    await mongoServer.stop().catch(() => {});
    mongoServer = null;
  }
});
