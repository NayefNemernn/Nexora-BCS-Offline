import Product from "../models/Product.js";
import Batch   from "../models/Batch.js";

// Values current stock per product: batch-tracked units at their own batch cost,
// any remaining stock not covered by batches at the product's flat cost.
// Reconciling per-product (instead of trusting batch totals globally) means
// orphaned batches (leftover from deleted products) are never summed in, and
// stock that has drifted above its batch total is still valued instead of
// silently dropped.
export async function computeInventoryValue(storeId) {
  const [products, batches] = await Promise.all([
    Product.find({ storeId }).select("cost stock").lean(),
    Batch.find({ storeId, remainingQty: { $gt: 0 } }).select("productId remainingQty costPrice").lean(),
  ]);

  const batchesByProduct = new Map();
  for (const b of batches) {
    const key = String(b.productId);
    const list = batchesByProduct.get(key) || [];
    list.push(b);
    batchesByProduct.set(key, list);
  }

  let inventoryValue = 0;
  for (const p of products) {
    const stock = p.stock || 0;
    if (stock <= 0) continue;

    const productBatches = batchesByProduct.get(String(p._id)) || [];
    const batchQty   = productBatches.reduce((s, b) => s + (b.remainingQty || 0), 0);
    const batchValue = productBatches.reduce((s, b) => s + (b.remainingQty || 0) * (b.costPrice || 0), 0);

    const coveredQty = Math.min(batchQty, stock);
    const extraQty   = stock - coveredQty;

    // batchValue already reflects remainingQty which may exceed stock (e.g. a batch
    // received but not yet fully reflected) — scale down proportionally in that case
    // so we never value more units than the product actually has in stock.
    const scaledBatchValue = batchQty > 0 ? batchValue * (coveredQty / batchQty) : 0;

    inventoryValue += scaledBatchValue + extraQty * (p.cost || 0);
  }

  return inventoryValue;
}
