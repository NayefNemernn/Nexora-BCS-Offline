// supplier.controller.js
import { Supplier, PurchaseOrder } from "../models/Supplier.js";
import Product from "../models/Product.js";
import StockLog from "../models/StockLog.js";
import AuditLog from "../models/AuditLog.js";

async function audit(req, description, meta = {}) {
  try { await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action: "stock_adjusted", description, meta }); } catch {}
}

/* ── SUPPLIERS ── */
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ storeId: req.storeId }).sort({ name: 1 });
    res.json(suppliers);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });
    const supplier = await Supplier.create({ storeId: req.storeId, name, phone, email, address, notes });
    res.status(201).json(supplier);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId }, req.body, { new: true }
    );
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteSupplier = async (req, res) => {
  try {
    await Supplier.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ message: "Supplier deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ── PURCHASE ORDERS ── */
export const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ storeId: req.storeId })
      .sort({ createdAt: -1 }).limit(200)
      .populate("supplierId", "name");
    res.json(orders);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, supplierName, items, notes, receivedAt } = req.body;
    if (!items?.length) return res.status(400).json({ message: "items required" });

    let totalCost = 0;
    const enrichedItems = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId: req.storeId });
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });

      const subtotal = item.quantity * item.costPerUnit;
      totalCost += subtotal;
      enrichedItems.push({ productId: product._id, productName: product.name, quantity: item.quantity, costPerUnit: item.costPerUnit, subtotal });

      // Update stock
      const newStock = product.stock + item.quantity;
      await StockLog.create({
        storeId: req.storeId, productId: product._id, userId: req.user._id,
        productName: product.name, type: "manual_add",
        quantityBefore: product.stock, change: item.quantity, quantityAfter: newStock,
        reason: `Purchase order from ${supplierName || "supplier"}`,
      });
      product.stock = newStock;
      // Update cost if provided
      if (item.costPerUnit > 0) product.cost = item.costPerUnit;
      await product.save();
    }

    const order = await PurchaseOrder.create({
      storeId: req.storeId, userId: req.user._id, username: req.user.username,
      supplierId: supplierId || null, supplierName: supplierName || "",
      items: enrichedItems, totalCost: +totalCost.toFixed(2), notes,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(), status: "received",
    });

    await audit(req, `Purchase order received — ${items.length} products, total $${totalCost.toFixed(2)}`, { orderId: order._id });
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Purchase order deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};