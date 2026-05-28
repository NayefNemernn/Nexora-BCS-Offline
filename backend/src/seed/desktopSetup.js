/**
 * Runs on every Electron launch.
 * - Creates the platform superadmin if none exists (superadmin has NO store — they manage all stores).
 * - Lifts plan limits on every existing store so the desktop app is never
 *   capped by SaaS trial defaults.
 */
import User  from "../models/User.js";
import Store from "../models/Store.js";

export async function ensureDesktopSuperAdmin() {
  if (process.env.ELECTRON_RUN !== "true") return;

  const username = process.env.DESKTOP_ADMIN_USER || "admin";
  const password = process.env.DESKTOP_ADMIN_PASS || "886659";

  // Lift limits on ALL stores — covers stores registered via the app that
  // inherited the SaaS trial cap of 100 products / 2 users.
  await Store.updateMany(
    { maxProducts: { $lt: 999999 } },
    { $set: { maxProducts: 999999, maxUsers: 100, plan: "enterprise", planExpiresAt: new Date("2099-01-01") } }
  );

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
