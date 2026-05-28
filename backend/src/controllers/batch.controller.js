import Batch    from "../models/Batch.js";
import Product  from "../models/Product.js";
import StockLog from "../models/StockLog.js";
import AuditLog from "../models/AuditLog.js";

/* ── GET /api/batches  (admin) ───────────────────────────────── */
export const getBatches = async (req, res) => {
  try {
    const { productId, status, search } = req.query;
    const filter = { storeId: req.storeId };

    if (productId) filter.productId = productId;

    if (status === "active")   filter.remainingQty = { $gt: 0 };
    if (status === "depleted") filter.remainingQty = { $lte: 0 };
    if (status === "expired") {
      filter.expiryDate   = { $lt: new Date() };
      filter.remainingQty = { $gt: 0 };
    }
    if (status === "expiring") {
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      filter.expiryDate   = { $gte: new Date(), $lte: soon };
      filter.remainingQty = { $gt: 0 };
    }

    let query = Batch.find(filter)
      .populate("productId",  "name barcode")
      .populate("supplierId", "name")
      .sort({ receivedDate: 1, createdAt: 1 });

    const batches = await query;

    // Optional text search on product name after populate
    const filtered = search
      ? batches.filter(b => b.productId?.name?.toLowerCase().includes(search.toLowerCase()) || b.batchNumber?.toLowerCase().includes(search.toLowerCase()))
      : batches;

    // Summary counts
    const now  = new Date();
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const all  = await Batch.find({ storeId: req.storeId });
    const summary = {
      total:     all.filter(b => b.remainingQty > 0).length,
      expiring:  all.filter(b => b.remainingQty > 0 && b.expiryDate && b.expiryDate >= now && b.expiryDate <= soon).length,
      expired:   all.filter(b => b.remainingQty > 0 && b.expiryDate && b.expiryDate < now).length,
      depleted:  all.filter(b => b.remainingQty <= 0).length,
    };

    res.json({ batches: filtered, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/batches/product/:productId  (admin) ────────────── */
export const getBatchesForProduct = async (req, res) => {
  try {
    const batches = await Batch.find({ productId: req.params.productId, storeId: req.storeId })
      .populate("supplierId", "name")
      .sort({ expiryDate: 1, createdAt: 1 });
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── POST /api/batches  (admin) ──────────────────────────────── */
export const createBatch = async (req, res) => {
  try {
    const { productId, qty, expiryDate, costPrice, supplierId, supplierName, notes, receivedDate } = req.body;

    if (!productId)        return res.status(400).json({ message: "Product is required" });
    if (!qty || qty < 1)   return res.status(400).json({ message: "Quantity must be at least 1" });

    const product = await Product.findOne({ _id: productId, storeId: req.storeId });
    if (!product)          return res.status(404).json({ message: "Product not found" });

    const batch = await Batch.create({
      storeId:      req.storeId,
      productId,
      supplierId:   supplierId   || null,
      supplierName: supplierName || "",
      expiryDate:   expiryDate   || null,
      receivedDate: receivedDate || new Date(),
      initialQty:   qty,
      remainingQty: qty,
      costPrice:    costPrice !== undefined ? costPrice : (product.cost || 0),
      notes:        notes || "",
    });

    // Update product stock and cost
    const update = { $inc: { stock: qty } };
    if (costPrice !== undefined) update.$set = { cost: costPrice };
    await Product.findByIdAndUpdate(productId, update);

    await StockLog.create({
      storeId:        req.storeId,
      productId:      product._id,
      userId:         req.user._id,
      productName:    product.name,
      type:           "batch_received",
      quantityBefore: product.stock,
      change:         qty,
      quantityAfter:  product.stock + qty,
      reason:         `Batch ${batch.batchNumber} received${expiryDate ? ` — expiry ${new Date(expiryDate).toLocaleDateString()}` : ""}`,
      reference:      batch.batchNumber,
    });

    await AuditLog.create({
      storeId:  req.storeId,
      userId:   req.user._id,
      username: req.user.username,
      action:   "batch_received",
      description: `Received batch ${batch.batchNumber} for ${product.name}: +${qty} units`,
    });

    res.status(201).json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PUT /api/batches/:id  (admin) ───────────────────────────── */
export const updateBatch = async (req, res) => {
  try {
    const { expiryDate, costPrice, supplierName, supplierId, notes, receivedDate } = req.body;

    const batch = await Batch.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    if (expiryDate   !== undefined) batch.expiryDate   = expiryDate   || null;
    if (costPrice    !== undefined) batch.costPrice    = costPrice;
    if (supplierName !== undefined) batch.supplierName = supplierName;
    if (supplierId   !== undefined) batch.supplierId   = supplierId || null;
    if (notes        !== undefined) batch.notes        = notes;
    if (receivedDate !== undefined) batch.receivedDate = receivedDate;

    await batch.save();
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/batches/:id/adjust  (admin) ─────────────────── */
export const adjustBatchQty = async (req, res) => {
  try {
    const { change, reason } = req.body;
    if (!change || change === 0) return res.status(400).json({ message: "Change must be non-zero" });

    const batch = await Batch.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const newQty = batch.remainingQty + Number(change);
    if (newQty < 0) return res.status(400).json({ message: "Remaining qty cannot go below zero" });

    const product = await Product.findById(batch.productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    batch.remainingQty = newQty;
    await batch.save();

    // Sync product stock
    await Product.findByIdAndUpdate(batch.productId, { $inc: { stock: Number(change) } });

    await StockLog.create({
      storeId:        req.storeId,
      productId:      batch.productId,
      userId:         req.user._id,
      productName:    product.name,
      type:           "adjustment",
      quantityBefore: product.stock,
      change:         Number(change),
      quantityAfter:  product.stock + Number(change),
      reason:         reason || `Manual adjustment on batch ${batch.batchNumber}`,
      reference:      batch.batchNumber,
    });

    res.json({ message: "Batch adjusted", batch });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── DELETE /api/batches/:id  (admin) ────────────────────────── */
export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    // Subtract remaining qty from product stock before deleting
    if (batch.remainingQty > 0) {
      await Product.findByIdAndUpdate(batch.productId, { $inc: { stock: -batch.remainingQty } });
    }

    await Batch.findByIdAndDelete(batch._id);

    await AuditLog.create({
      storeId:  req.storeId,
      userId:   req.user._id,
      username: req.user.username,
      action:   "batch_deleted",
      description: `Deleted batch ${batch.batchNumber}`,
    });

    res.json({ message: "Batch deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
