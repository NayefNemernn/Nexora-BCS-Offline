/**
 * Runs on every Electron launch.
 * - Creates the platform superadmin ONLY on the superadmin's machine (private key present).
 *   Client machines use the license-created admin instead — skip to avoid username conflicts.
 * - Lifts plan limits on every existing non-licensed store.
 */
import User  from "../models/User.js";
import Store from "../models/Store.js";

export async function ensureDesktopSuperAdmin() {
  if (process.env.ELECTRON_RUN !== "true") return;

  // Lift limits only on stores that are NOT from a .nexora license.
  await Store.updateMany(
    { maxProducts: { $lt: 999999 }, licenseId: null },
    { $set: { maxProducts: 999999, maxUsers: 100, plan: "enterprise", planExpiresAt: new Date("2099-01-01") } }
  );

  // Only create/maintain the superadmin account on the superadmin's own machine.
  // Client machines have a private-key-less install — they log in via a licensed admin account.
  const { isPrivateKeyConfigured } = await import("../services/licenseSigner.js");
  if (!isPrivateKeyConfigured()) return;

  const username = process.env.DESKTOP_ADMIN_USER || "admin";
  const password = process.env.DESKTOP_ADMIN_PASS || "886659";

  const existing = await User.findOne({ role: "superadmin" });

  if (existing) {
    // Keep password in sync so a forgotten password can be reset via env var.
    existing.password = password;
    await existing.save();
    return;
  }

  // First launch — create superadmin only (no store; superadmin controls all stores).
  const superadmin = new User({ username, password, role: "superadmin" });
  await superadmin.save();

  console.log(`\n${"─".repeat(50)}`);
  console.log("  Nexora POS — First Launch Setup");
  console.log(`${"─".repeat(50)}`);
  console.log(`  Superadmin : ${username} / ${password}`);
  console.log(`  ⚠️  Log in as superadmin, then create a store`);
  console.log(`     for your business from the Stores panel.`);
  console.log(`${"─".repeat(50)}\n`);
}
