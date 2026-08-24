import Product from "../models/Product.js";

// Total value of stock on hand — product.cost × product.stock, summed.
// This is deliberately the same formula the Products List page uses, so the
// two never disagree. product.cost is kept accurate by batch.controller.js,
// which folds each newly-added batch's cost into it as a stock-weighted
// average — that's the only place batch data feeds into this number; sales,
// returns, and voids never touch it. No separate batch-blended valuation
// here to drift away from what Products List shows.
export async function computeInventoryValue(storeId) {
  const products = await Product.find({ storeId }).select("cost stock").lean();
  return products.reduce((sum, p) => sum + (p.cost || 0) * (p.stock || 0), 0);
}
