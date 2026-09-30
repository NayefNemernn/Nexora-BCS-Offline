"use strict";

const { app, BrowserWindow, shell, dialog, utilityProcess, ipcMain, nativeTheme } = require("electron");
const path = require("path");
const http = require("http");
const fs   = require("fs");
const { buildBarcodeLabel } = require("./escpos");

const IS_DEV = !app.isPackaged;

// Mongo's stdout occasionally interleaves two log lines into one JSON.parse
// call inside mongodb-memory-server, which throws outside any promise chain
// we control — left unhandled, that crashes the whole app with no recovery.
// Log it and keep running instead.
process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException:", err);
  dialog.showErrorBox(
    "Unexpected error",
    `${err.message}\n\nThe app hit an internal error but is staying open. If something looks broken, restart the app.`
  );
});

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

// Offline voice input runs Whisper as multi-threaded WASM in a web worker, which needs
// SharedArrayBuffer. Chromium only allows that on cross-origin-isolated pages unless this
// feature is on; enabling it here avoids adding COOP/COEP headers that could break the
// rest of the app's cross-origin resources. (Without it voice still works, ~2x slower.)
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

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

// ── Cash drawer via the receipt printer ───────────────────────────────────────
// An RJ11 cash drawer is wired to the receipt printer, not the PC: sending the
// printer the ESC/POS "kick" command makes it pulse the drawer. Chromium can't
// send raw bytes to a printer, so we write a RAW job through the Windows
// spooler (winspool.drv) from PowerShell. Pulses both pin 2 and pin 5, since
// drawers are wired to one or the other.
const DRAWER_KICK = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa, 0x1b, 0x70, 0x01, 0x19, 0xfa]);
const VIRTUAL_PRINTER = /pdf|xps|onenote|fax|send to/i;

const RAW_PRINT_PS = String.raw`
$ErrorActionPreference = 'Stop'
$p = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $env:NEXORA_PRINTER }
if (-not $p) { Write-Output 'NOT_FOUND'; exit 2 }
if ($p.WorkOffline) { Write-Output 'OFFLINE'; exit 3 }
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class NexoraRawPrint {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO { public string pDocName; public string pOutputFile; public string pDataType; }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern bool OpenPrinter(string name, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)] static extern int StartDocPrinter(IntPtr h, int level, DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool WritePrinter(IntPtr h, byte[] b, int n, out int w);
  public static void Send(string printer, string docName, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("OpenPrinter failed (" + Marshal.GetLastWin32Error() + ")");
    try {
      if (StartDocPrinter(h, 1, new DOCINFO { pDocName = docName, pDataType = "RAW" }) == 0)
        throw new Exception("StartDocPrinter failed (" + Marshal.GetLastWin32Error() + ")");
      try {
        StartPagePrinter(h);
        int written;
        if (!WritePrinter(h, data, data.Length, out written)) throw new Exception("WritePrinter failed (" + Marshal.GetLastWin32Error() + ")");
        EndPagePrinter(h);
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
[NexoraRawPrint]::Send($env:NEXORA_PRINTER, $env:NEXORA_DOC, [Convert]::FromBase64String($env:NEXORA_BYTES))
Write-Output 'OK'
`;

// The receipt printer: Windows default, skipping virtual printers (PDF etc.).
async function pickReceiptPrinter(webContents) {
  const printers = await webContents.getPrintersAsync().catch(() => []);
  const real     = printers.filter(p => !VIRTUAL_PRINTER.test(p.name));
  return (real.find(p => p.isDefault) || real[0])?.name || null;
}

// Sends raw ESC/POS bytes to a printer through the spooler.
// Returns { ok: true, printer } or { ok: false, reason, printer?, message? }
//   reason: 'unsupported' | 'no_printer' | 'offline' | 'error'
async function sendRawToPrinter(webContents, bytes, docName) {
  if (process.platform !== "win32") return { ok: false, reason: "unsupported" };
  const printer = await pickReceiptPrinter(webContents);
  if (!printer) return { ok: false, reason: "no_printer" };

  const { execFile } = require("child_process");
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", RAW_PRINT_PS],
      {
        windowsHide: true, timeout: 20_000,
        env: { ...process.env, NEXORA_PRINTER: printer, NEXORA_BYTES: bytes.toString("base64"), NEXORA_DOC: docName },
      },
      (err, stdout, stderr) => {
        const out = String(stdout).trim();
        if (out.endsWith("OK"))    return resolve({ ok: true, printer });
        if (out === "OFFLINE")     return resolve({ ok: false, reason: "offline", printer });
        if (out === "NOT_FOUND")   return resolve({ ok: false, reason: "no_printer", printer });
        console.error("[raw-print]", err?.message, stderr);
        resolve({ ok: false, reason: "error", printer, message: String(stderr || err?.message || "").trim().split("\n")[0] });
      }
    );
  });
}

ipcMain.handle("open-cash-drawer", (event) =>
  sendRawToPrinter(event.sender, DRAWER_KICK, "Nexora cash drawer"));

// Barcode label drawn by the printer itself (see electron/escpos.js).
// reason 'unsupported_format' → caller falls back to HTML printing.
ipcMain.handle("print-barcode-label", (event, { value, format, label } = {}) => {
  const bytes = buildBarcodeLabel(value, format, label);
  if (!bytes) return { ok: false, reason: "unsupported_format" };
  return sendRawToPrinter(event.sender, bytes, "Nexora barcode label");
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
