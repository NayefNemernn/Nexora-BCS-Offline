"use strict";

const { app, BrowserWindow, shell, dialog, utilityProcess } = require("electron");
const path = require("path");
const http = require("http");
const fs   = require("fs");

const IS_DEV = !app.isPackaged;

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

  // Always prefer the pre-bundled mongod binary (dev or packaged) so the app
  // never tries to download MongoDB at runtime.
  const binName = process.platform === "win32" ? "mongod.exe" : "mongod";
  const bundledBin = IS_DEV
    ? path.join(__dirname, "build-resources", "mongodb-binary",
        process.platform === "win32" ? "win" : "linux", binName)
    : path.join(process.resourcesPath, "mongodb-binary", binName);

  if (fs.existsSync(bundledBin)) {
    if (process.platform !== "win32") {
      try { fs.chmodSync(bundledBin, 0o755); } catch {}
    }
    process.env.MONGOMS_SYSTEM_BINARY = bundledBin;
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
function startBackend(mongoUri, licenseFile) {
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
    UPLOADS_DIR:      uploadsDir,
    FRONTEND_DIST:    frontendDist,
    USER_DATA_PATH:   userData,
    ...(licenseFile ? { LICENSE_FILE: licenseFile } : {}),
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
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  const adminUser = process.env.DESKTOP_ADMIN_USER || "admin";
  const adminPass = process.env.DESKTOP_ADMIN_PASS || "886659";

  const isFirstLaunch = !fs.existsSync(path.join(mongoDataDir, "WiredTiger"));

  const splashHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#0f172a;color:#f8fafc;font-family:system-ui,sans-serif;
       display:flex;flex-direction:column;align-items:center;
       justify-content:center;height:100vh;gap:12px}
  h1{font-size:22px;font-weight:700}
  p{font-size:13px;color:#94a3b8}
  .box{background:#1e293b;border:1px solid #334155;border-radius:8px;
       padding:14px 24px;margin-top:8px;text-align:center}
  .box b{color:#38bdf8}
  .warn{font-size:11px;color:#f59e0b;margin-top:4px}
  .dot{width:8px;height:8px;border-radius:50%;background:#38bdf8;
       animation:blink 1s infinite;display:inline-block;margin:0 2px}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
</style></head>
<body>
  <h1>Nexora POS</h1>
  <p>Starting database &amp; server… <span class="dot"></span></p>
  ${isFirstLaunch ? `
  <div class="box">
    <p style="color:#94a3b8;font-size:12px;margin-bottom:6px">First launch — default superadmin login:</p>
    <p>Username: <b>${adminUser}</b> &nbsp;|&nbsp; Password: <b>${adminPass}</b></p>
    <p class="warn">⚠ Change your password after first login</p>
  </div>` : ""}
</body></html>`;

  // Show splash
  mainWindow = new BrowserWindow({
    width: 480, height: isFirstLaunch ? 320 : 240,
    frame: false, resizable: false,
    webPreferences: { contextIsolation: true },
  });
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);

  try {
    // On first launch, ask for a .nexora license file if the user has one.
    // If they skip (superadmin's own machine), the app starts in full mode.
    let licenseFile = null;
    if (isFirstLaunch) {
      const picked = await dialog.showOpenDialog(mainWindow, {
        title:       "Select License File (optional)",
        message:     "If you received a .nexora license file from your provider, select it now. Click Cancel to skip (for standalone / superadmin use).",
        buttonLabel: "Use This License",
        filters:     [{ name: "Nexora License", extensions: ["nexora"] }],
        properties:  ["openFile"],
      });
      if (!picked.canceled && picked.filePaths.length > 0) {
        licenseFile = picked.filePaths[0];
      }
    }

    const mongoUri = await startMongoDB();
    startBackend(mongoUri, licenseFile);
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
