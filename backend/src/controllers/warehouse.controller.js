import Warehouse      from "../models/Warehouse.js";
import WarehouseStock from "../models/WarehouseStock.js";
import Product        from "../models/Product.js";
import StockLog       from "../models/StockLog.js";
import AuditLog       from "../models/AuditLog.js";

async function audit(req, action, description, meta = {}) {
  try {
    await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta });
  } catch {}
}

/* ── CRUD ──────────────────────────────────────────────────────────────────── */

// GET /api/warehouses
export const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ storeId: req.storeId }).sort({ createdAt: 1 });
    // Enrich with stock totals
    const enriched = await Promise.all(warehouses.map(async (w) => {
      const stocks = await WarehouseStock.find({ warehouseId: w._id, storeId: req.storeId, quantity: { $gt: 0 } });
      const totalUnits    = stocks.reduce((s, e) => s + e.quantity, 0);
      const productCount  = stocks.length;
      return { ...w.toObject(), totalUnits, productCount };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/warehouses  { name, description }
export const createWarehouse = async (req, res) => {
  try {
    const { name, description = "" } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    const w = await Warehouse.create({ name: name.trim(), description, storeId: req.storeId });
    await audit(req, "warehouse_created", `Created warehouse: ${name}`);
    res.status(201).json({ ...w.toObject(), totalUnits: 0, productCount: 0 });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// PUT /api/warehouses/:id  { name, description }
export const updateWarehouse = async (req, res) => {
  try {
    const { name, description } = req.body;
    const w = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { ...(name ? { name: name.trim() } : {}), ...(description !== undefined ? { description } : {}) },
      { new: true }
    );
    if (!w) return res.status(404).json({ message: "Warehouse not found" });
    res.json(w);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// DELETE /api/warehouses/:id
export const deleteWarehouse = async (req, res) => {
  try {
    const hasStock = await WarehouseStock.exists({ warehouseId: req.params.id, quantity: { $gt: 0 } });
    if (hasStock) return res.status(400).json({ message: "Cannot delete warehouse with stock. Transfer all stock first." });
    await Warehouse.deleteOne({ _id: req.params.id, storeId: req.storeId });
    await WarehouseStock.deleteMany({ warehouseId: req.params.id });
    res.json({ message: "Warehouse deleted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* ── STOCK OPERATIONS ──────────────────────────────────────────────────────── */

// GET /api/warehouses/:id/stock
export const getWarehouseStock = async (req, res) => {
  try {
    const entries = await WarehouseStock.find({ warehouseId: req.params.id, storeId: req.storeId, quantity: { $gt: 0 } })
      .populate("productId", "name barcode price cost category image stock")
      .sort({ updatedAt: -1 });
    res.json(entries.filter(e => e.productId)); // remove orphaned entries
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/warehouses/receive-supplier
// { warehouseId, productId, quantity, reason }  — new stock from supplier → warehouse
export const receiveSupplier = async (req, res) => {
  try {
    const { warehouseId, productId, quantity, reason = "" } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity must be positive" });

    const [warehouse, product] = await Promise.all([
      Warehouse.findOne({ _id: warehouseId, storeId: req.storeId }),
      Product.findOne({ _id: productId, storeId: req.storeId }),
    ]);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    if (!product)   return res.status(404).json({ message: "Product not found" });

    const entry = await WarehouseStock.findOneAndUpdate(
      { warehouseId, productId, storeId: req.storeId },
      { $inc: { quantity: qty }, $setOnInsert: { warehouseId, productId, storeId: req.storeId } },
      { upsert: true, new: true }
    );

    await StockLog.create({
      storeId: req.storeId, productId, userId: req.user._id,
      productName: product.name, type: "warehouse_in",
      quantityBefore: entry.quantity - qty, change: qty, quantityAfter: entry.quantity,
      reason: reason || `Received to warehouse: ${warehouse.name}`,
    });

    await audit(req, "warehouse_receive_supplier", `Received ${qty} × ${product.name} to ${warehouse.name}`);
    res.json({ message: "Received to warehouse", entry });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/warehouses/move-to
// { warehouseId, productId, quantity }  — showroom → warehouse
export const moveToWarehouse = async (req, res) => {
  try {
    const { warehouseId, productId, quantity, reason = "" } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity must be positive" });

    const [warehouse, product] = await Promise.all([
      Warehouse.findOne({ _id: warehouseId, storeId: req.storeId }),
      Product.findOne({ _id: productId, storeId: req.storeId }),
    ]);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    if (!product)   return res.status(404).json({ message: "Product not found" });
    if (product.stock < qty) return res.status(400).json({ message: "Not enough showroom stock" });

    const beforeShowroom = product.stock;
    product.stock -= qty;
    await product.save();

    const entry = await WarehouseStock.findOneAndUpdate(
      { warehouseId, productId, storeId: req.storeId },
      { $inc: { quantity: qty }, $setOnInsert: { warehouseId, productId, storeId: req.storeId } },
      { upsert: true, new: true }
    );

    await StockLog.create({
      storeId: req.storeId, productId, userId: req.user._id,
      productName: product.name, type: "warehouse_in",
      quantityBefore: beforeShowroom, change: -qty, quantityAfter: product.stock,
      reason: reason || `Moved to warehouse: ${warehouse.name}`,
    });

    await audit(req, "warehouse_move_to", `Moved ${qty} × ${product.name} to ${warehouse.name}`);
    res.json({ message: "Moved to warehouse", product, entry });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/warehouses/move-from
// { warehouseId, productId, quantity }  — warehouse → showroom
export const moveFromWarehouse = async (req, res) => {
  try {
    const { warehouseId, productId, quantity, reason = "" } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity must be positive" });

    const [warehouse, product, entry] = await Promise.all([
      Warehouse.findOne({ _id: warehouseId, storeId: req.storeId }),
      Product.findOne({ _id: productId, storeId: req.storeId }),
      WarehouseStock.findOne({ warehouseId, productId, storeId: req.storeId }),
    ]);
    if (!warehouse) return res.status(404).json({ message: "Warehouse not found" });
    if (!product)   return res.status(404).json({ message: "Product not found" });
    if (!entry || entry.quantity < qty) return res.status(400).json({ message: "Insufficient warehouse stock" });

    entry.quantity -= qty;
    if (entry.quantity <= 0) await entry.deleteOne();
    else await entry.save();

    const beforeShowroom = product.stock;
    product.stock += qty;
    await product.save();

    await StockLog.create({
      storeId: req.storeId, productId, userId: req.user._id,
      productName: product.name, type: "warehouse_transfer",
      quantityBefore: beforeShowroom, change: qty, quantityAfter: product.stock,
      reason: reason || `Received from warehouse: ${warehouse.name}`,
    });

    await audit(req, "warehouse_move_from", `Received ${qty} × ${product.name} from ${warehouse.name} to showroom`);
    res.json({ message: "Moved to showroom", product, entry });
  } catch (e) { res.status(500).json({ message: e.message }); }
};
