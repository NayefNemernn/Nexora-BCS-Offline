/**
 * Run the backend + your existing seeded data WITHOUT Electron, so you can
 * test in a normal browser tab instead of building/installing the desktop app.
 *
 * - Reuses the same MongoDB data directory the real desktop app uses
 *   (%APPDATA%/nexora-pos/mongodb-data) — same store, products, coffee cups, etc.
 * - Serves the already-built frontend/dist on the same origin.
 * - The license gate auto-bypasses on this machine (it holds the signing
 *   private key), same as the real app — no activation needed.
 *
 * Usage:
 *   1. Make sure the real Nexora POS desktop app is NOT running (same Mongo
 *      data dir — two mongod processes on it at once will conflict).
 *   2. node scripts/dev-server.mjs
 *   3. Open http://localhost:5000 in any browser.
 *
 * If you changed frontend code, rebuild first: npm run build:frontend
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR   = path.resolve(__dirname, "..");

const userData     = path.join(os.homedir(), "AppData", "Roaming", "nexora-pos");
const mongoDataDir = path.join(userData, "mongodb-data");
const uploadsDir   = path.join(userData, "uploads");
const frontendDist = path.join(APP_DIR, "frontend", "dist");
const backendDir   = path.join(APP_DIR, "backend");

if (!fs.existsSync(frontendDist)) {
  console.error(`frontend/dist not found at ${frontendDist} — run "npm run build:frontend" first.`);
  process.exit(1);
}

console.log("Starting embedded MongoDB against the existing app data...");
const mongo = await MongoMemoryServer.create({
  instance: { dbPath: mongoDataDir, storageEngine: "wiredTiger" },
  binary:   { downloadDir: path.join(userData, "mongodb-binary") },
});
const mongoUri = mongo.getUri();
console.log("Mongo ready:", mongoUri);

const backend = spawn(process.execPath, [path.join(backendDir, "src", "server.js")], {
  cwd: backendDir,
  env: {
    ...process.env,
    MONGO_URI:     mongoUri,
    PORT:          "5000",
    JWT_SECRET:    process.env.JWT_SECRET || "nexora-desktop-offline-secret",
    NODE_ENV:      "production",
    ELECTRON_RUN:  "true",       // makes the backend serve the SPA + seed superadmin if needed
    UPLOADS_DIR:   uploadsDir,
    FRONTEND_DIST: frontendDist,
  },
  stdio: "inherit",
});

const shutdown = async () => {
  backend.kill();
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

backend.on("exit", async (code) => {
  console.log("backend exited", code);
  await mongo.stop();
  process.exit(code ?? 0);
});

console.log("\nOpen http://localhost:5000 in your browser. Ctrl+C to stop.\n");
