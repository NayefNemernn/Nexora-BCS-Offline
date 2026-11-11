/**
 * MIGRATION — product unit types (piece / kg / L)
 *
 * Runs on every server start (see server.js) and is safe to repeat: it only
 * touches products that have no `unitType` yet, marking them "piece" so they
 * keep selling exactly as before. Nothing else about a product changes —
 * price, cost and stock are left alone, and `updatedAt` is not bumped.
 *
 * Old sale / pay-later line items need no change: a line with no `unitType`
 * is read as "piece".
 *
 * Can also be run by hand:  node src/migrations/addUnitType.js
 */
import { fileURLToPath } from "url";
import Product from "../models/Product.js";
import { DEFAULT_UNIT } from "../utils/quantity.js";

export async function backfillProductUnitType() {
  const result = await Product.updateMany(
    { unitType: { $exists: false } },
    { $set: { unitType: DEFAULT_UNIT } },
    { timestamps: false }
  );
  if (result.modifiedCount > 0) {
    console.log(`✅ Migration: ${result.modifiedCount} product(s) set to unit "${DEFAULT_UNIT}"`);
  }
  return result.modifiedCount;
}

// Standalone run
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { default: mongoose } = await import("mongoose");
  const { default: dotenv }   = await import("dotenv");
  dotenv.config();
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const count = await backfillProductUnitType();
  console.log(`Done — ${count} product(s) updated`);
  await mongoose.disconnect();
}
