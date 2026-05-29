import Product        from "../models/Product.js";
import StockLog       from "../models/StockLog.js";
import AuditLog       from "../models/AuditLog.js";
import WarehouseStock from "../models/WarehouseStock.js";

async function audit(req, action, description, meta = {}) {
  try {
    await AuditLog.create({ storeId: req.storeId, userId: req.user._id, username: req.user.username, action, description, meta });
  } catch {}
}

/* POST /api/stock/adjust
   Body: { productId, change, reason, type }
   type: "manual_add" | "manual_remove" | "adjustment"
*/
export const adjustStock = async (req, res) => {
  try {
    const { productId, change, reason = "", type = "adjustment" } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });
    if (change === 0 || isNaN(change)) return res.status(400).json({ message: "change must be non-zero number" });

    const product = await Product.findOne({ _id: productId, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newStock = product.stock + Number(change);
    if (newStock < 0) return res.status(400).json({ message: "Stock cannot go below zero" });

    await StockLog.create({
      storeId:        req.storeId,
      productId:      product._id,
      userId:         req.user._id,
      productName:    product.name,
      type,
      quantityBefore: product.stock,
      change:         Number(change),
      quantityAfter:  newStock,
      reason,
    });

    product.stock = newStock;
    await product.save();

    await audit(req, "stock_adjusted",
      `Stock adjusted: ${product.name} ${change > 0 ? "+" : ""}${change} (reason: ${reason || "none"})`,
      { productId, change, newStock, reason }
    );

    res.json({ message: "Stock adjusted", product });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* POST /api/stock/warehouse/add
   Body: { productId, quantity, reason }
   Moves qty FROM showroom stock → warehouseStock (store it)
*/
export const addToWarehouse = async (req, res) => {
  try {
    const { productId, quantity, reason = "" } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });
    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity must be positive" });

    const product = await Product.findOne({ _id: productId, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (product.stock < qty)
      return res.status(400).json({ message: "Not enough showroom stock" });

    const beforeShowroom  = product.stock;
    const beforeWarehouse = product.warehouseStock ?? 0;
    product.stock         = product.stock - qty;
    product.warehouseStock = beforeWarehouse + qty;
    await product.save();

    await StockLog.create({
      storeId: req.storeId, productId: product._id, userId: req.user._id,
      productName: product.name, type: "warehouse_in",
      quantityBefore: beforeShowroom, change: -qty, quantityAfter: product.stock,
      reason: reason || "Moved to warehouse",
    });

    await audit(req, "warehouse_add", `Moved ${qty} × ${product.name} to warehouse`, { productId, qty });
    res.json({ message: "Moved to warehouse", product });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* POST /api/stock/warehouse/receive-supplier
   Body: { productId, quantity, reason }
   Receives new supplier stock directly into warehouse (no showroom deduction)
*/
export const receiveToWarehouse = async (req, res) => {
  try {
    const { productId, quantity, reason = "" } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });
    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity must be positive" });

    const product = await Product.findOne({ _id: productId, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const before = product.warehouseStock ?? 0;
    product.warehouseStock = before + qty;
    await product.save();

    await StockLog.create({
      storeId: req.storeId, productId: product._id, userId: req.user._id,
      productName: product.name, type: "warehouse_in",
      quantityBefore: before, change: qty, quantityAfter: product.warehouseStock,
      reason: reason || "Received from supplier to warehouse",
    });

    await audit(req, "warehouse_receive", `Received ${qty} × ${product.name} to warehouse from supplier`, { productId, qty });
    res.json({ message: "Received to warehouse", product });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* POST /api/stock/warehouse/transfer
   Body: { productId, quantity }  — moves qty from warehouseStock → stock (showroom)
*/
export const transferToShowroom = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });
    const qty = Number(quantity);
    if (!qty || qty <= 0) return res.status(400).json({ message: "quantity must be positive" });

    const product = await Product.findOne({ _id: productId, storeId: req.storeId });
    if (!product) return res.status(404).json({ message: "Product not found" });
    if ((product.warehouseStock ?? 0) < qty)
      return res.status(400).json({ message: "Insufficient warehouse stock" });

    const beforeShowroom = product.stock;
    product.warehouseStock = (product.warehouseStock ?? 0) - qty;
    product.stock = product.stock + qty;
    await product.save();

    await StockLog.create({
      storeId: req.storeId, productId: product._id, userId: req.user._id,
      productName: product.name, type: "warehouse_transfer",
      quantityBefore: beforeShowroom, change: qty, quantityAfter: product.stock,
      reason: "Transfer: warehouse → showroom",
    });

    await audit(req, "warehouse_transfer", `Transferred ${qty} × ${product.name} to showroom`, { productId, qty });
    res.json({ message: "Transferred to showroom", product });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/* POST /api/stock/scan-receipt  (multipart: receipt image)
   Uses Gemini Vision to extract items from a supplier receipt
*/
const GEMINI_VISION_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`;

export const scanReceipt = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here")
      return res.status(503).json({ message: "AI service not configured" });
    if (!req.file)
      return res.status(400).json({ message: "No image provided" });

    const base64  = req.file.buffer.toString("base64");
    const mime    = req.file.mimetype;

    const prompt =
      `You are analyzing a supplier receipt or invoice image.\n` +
      `Extract every line item and return ONLY a valid JSON array — no markdown, no text outside the array.\n` +
      `Each element must be:\n` +
      `{ "name": "product name", "quantity": <number>, "unitCost": <number or null>, "totalCost": <number or null> }\n` +
      `- name: as printed on the receipt (keep original language)\n` +
      `- quantity: numeric units received\n` +
      `- unitCost: cost per unit; if missing, calculate from totalCost/quantity; null if unknown\n` +
      `- totalCost: line total; null if unknown\n` +
      `Return [] if you cannot find any items.`;

    const response = await fetch(`${GEMINI_VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { inlineData: { mimeType: mime, data: base64 } },
          { text: prompt }
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ message: data.error?.message || "AI error" });

    const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "[]";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const items = JSON.parse(clean);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/* GET /api/stock/logs?productId=xxx */
export const getStockLogs = async (req, res) => {
  try {
    const filter = { storeId: req.storeId };
    if (req.query.productId) filter.productId = req.query.productId;
    const logs = await StockLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("userId", "username");
    res.json(logs);
  } catch (e) { res.status(500).json({ message: e.message }); }
};