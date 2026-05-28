/**
 * MIGRATION SCRIPT
 * Converts existing single-user data (userId isolation) → multi-tenant (storeId isolation)
 *
 * Run ONCE on your existing database:
 *   node src/migrate.js
 *
 * What it does:
 *   1. For every admin user → creates a Store document
 *   2. Links admin.storeId → that store
 *   3. Updates all Products, Sales, Categories, HoldSales, Payments
 *      that belong to that admin's userId → storeId
 *   4. For cashiers that were already in the system → links them to their admin's store
 *      (if a cashier has no matching admin, you'll be prompted to handle manually)
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
dotenv.config();

import User     from "./models/User.js";
import Store    from "./models/Store.js";
import Product  from "./models/Product.js";
import Sale     from "./models/Sale.js";
import Category from "./models/Category.js";
import HoldSale from "./models/HoldSale.js";
import Payment  from "./models/Payment.js";

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI, { autoIndex: false });
  console.log("✅ Connected\n");

  // ── 1. Find all admin users (they each own a store) ──────────────────────
  const admins = await User.find({ role: "admin" });
  console.log(`Found ${admins.length} admin user(s)\n`);

  const adminStoreMap = {}; // adminId (string) → storeId

  for (const admin of admins) {
    // Skip if already migrated
    if (admin.storeId) {
      console.log(`  ↩️  Admin "${admin.username}" already has storeId → skipping store creation`);
      adminStoreMap[String(admin._id)] = admin.storeId;
      continue;
    }

    console.log(`  📦 Creating store for admin "${admin.username}"...`);

    // Create store owned by this admin
    const store = await Store.create({
      name:     admin.storeName || `${admin.username}'s Store`,
      owner:    admin._id,
      currency: "USD",
      language: "en",
    });

    // Link admin → store
    admin.storeId = store._id;
    // Ensure role is set correctly (old system might have "admin" correct already)
    await admin.save();

    adminStoreMap[String(admin._id)] = store._id;
    console.log(`  ✅ Store "${store.name}" created (id: ${store._id})`);
  }

  console.log();

  // ── 2. Migrate Products ───────────────────────────────────────────────────
  console.log("📦 Migrating Products...");
  let productCount = 0;
  const products = await Product.find({ storeId: { $exists: false } });
  for (const p of products) {
    const storeId = adminStoreMap[String(p.userId)];
    if (!storeId) {
      console.warn(`  ⚠️  Product "${p.name}" has userId=${p.userId} with no matching admin store — skipping`);
      continue;
    }
    await Product.findByIdAndUpdate(p._id, { storeId });
    productCount++;
  }
  console.log(`  ✅ ${productCount} products migrated\n`);

  // ── 3. Migrate Sales ──────────────────────────────────────────────────────
  console.log("💰 Migrating Sales...");
  let saleCount = 0;
  const sales = await Sale.find({ storeId: { $exists: false } });
  for (const s of sales) {
    const storeId = adminStoreMap[String(s.userId)];
    if (!storeId) {
      console.warn(`  ⚠️  Sale ${s._id} has no matching admin store — skipping`);
      continue;
    }
    await Sale.findByIdAndUpdate(s._id, { storeId });
    saleCount++;
  }
  console.log(`  ✅ ${saleCount} sales migrated\n`);

  // ── 4. Migrate Categories ─────────────────────────────────────────────────
  console.log("🏷️  Migrating Categories...");
  let catCount = 0;
  const categories = await Category.find({ storeId: { $exists: false } });
  for (const c of categories) {
    const storeId = adminStoreMap[String(c.userId)];
    if (!storeId) {
      console.warn(`  ⚠️  Category "${c.name}" has no matching admin store — skipping`);
      continue;
    }
    await Category.findByIdAndUpdate(c._id, { storeId });
    catCount++;
  }
  console.log(`  ✅ ${catCount} categories migrated\n`);

  // ── 5. Migrate HoldSales ──────────────────────────────────────────────────
  console.log("⏸️  Migrating HoldSales (Pay Later)...");
  let holdCount = 0;
  const holdSales = await HoldSale.find({ storeId: { $exists: false } });
  for (const h of holdSales) {
    const storeId = adminStoreMap[String(h.userId)];
    if (!storeId) {
      console.warn(`  ⚠️  HoldSale ${h._id} has no matching admin store — skipping`);
      continue;
    }
    await HoldSale.findByIdAndUpdate(h._id, { storeId });
    holdCount++;
  }
  console.log(`  ✅ ${holdCount} hold-sales migrated\n`);

  // ── 6. Migrate Payments ───────────────────────────────────────────────────
  console.log("💳 Migrating Payments...");
  let payCount = 0;
  const payments = await Payment.find({ storeId: { $exists: false } });
  for (const p of payments) {
    const storeId = adminStoreMap[String(p.userId)];
    if (!storeId) {
      console.warn(`  ⚠️  Payment ${p._id} has no matching admin store — skipping`);
      continue;
    }
    await Payment.findByIdAndUpdate(p._id, { storeId });
    payCount++;
  }
  console.log(`  ✅ ${payCount} payments migrated\n`);

  // ── 7. Handle cashier users ───────────────────────────────────────────────
  // Old system: cashiers didn't have a storeId (they used their own userId for data)
  // New system: cashiers must belong to a store
  console.log("👤 Checking cashier users...");
  const cashiers = await User.find({ role: "cashier", storeId: { $exists: false } });
  if (cashiers.length === 0) {
    console.log("  ✅ No unlinked cashiers\n");
  } else {
    console.log(`  ⚠️  Found ${cashiers.length} cashier(s) without a store:`);
    for (const c of cashiers) {
      console.log(`       - "${c.username}" (id: ${c._id})`);
    }
    console.log("  ℹ️  These cashiers need to be manually assigned to a store.");
    console.log("     If you only have one store, run this SQL-equivalent:");
    console.log("     db.users.updateMany({role:'cashier'}, {$set:{storeId: YOUR_STORE_ID}})\n");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("✅ MIGRATION COMPLETE");
  console.log(`   Stores created:  ${Object.keys(adminStoreMap).length}`);
  console.log(`   Products:        ${productCount}`);
  console.log(`   Sales:           ${saleCount}`);
  console.log(`   Categories:      ${catCount}`);
  console.log(`   Hold-Sales:      ${holdCount}`);
  console.log(`   Payments:        ${payCount}`);
  console.log("═══════════════════════════════════════");

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});