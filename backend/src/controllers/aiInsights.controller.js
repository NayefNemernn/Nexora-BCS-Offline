import Product       from "../models/Product.js";
import Batch         from "../models/Batch.js";
import Sale          from "../models/Sale.js";
import { Supplier }  from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";

const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const MODEL = "gemini-2.5-flash-lite";

async function gemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") throw new Error("AI service not configured");

  const res = await fetch(`${GEMINI_URL(MODEL)}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API error");
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  return raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
}

// ── Shared: compute sales velocity ──────────────────────────────────────────
async function salesVelocity(storeId, days = 60) {
  const since = new Date(Date.now() - days * 86400000);
  const sales = await Sale.find({ storeId, createdAt: { $gte: since }, status: { $ne: "fully_returned" } });
  const map = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const id = item.productId.toString();
      map[id] = (map[id] || 0) + item.quantity;
    }
  }
  Object.keys(map).forEach(id => { map[id] = map[id] / days; });
  return map;
}

/* ── OFFER SUGGESTIONS ───────────────────────────────────────────────────── */
export const getOfferSuggestions = async (req, res) => {
  try {
    const storeId  = req.storeId;
    const products = await Product.find({ storeId });
    const velocity = await salesVelocity(storeId, 60);
    const batches  = await Batch.find({ storeId, remainingQty: { $gt: 0 } });

    const analysis = products.map(p => {
      const id         = p._id.toString();
      const dailySales = velocity[id] || 0;
      const pBatches   = batches.filter(b => b.productId.toString() === id);

      const batchInfo = pBatches.map(b => {
        const daysToExpiry = b.expiryDate
          ? Math.ceil((new Date(b.expiryDate) - new Date()) / 86400000) : null;
        const daysToSell = dailySales > 0 ? Math.ceil(b.remainingQty / dailySales) : null;
        return { batchNumber: b.batchNumber, remainingQty: b.remainingQty, daysToExpiry, daysToSell };
      });

      return {
        productId:       id,
        name:            p.name,
        currentStock:    p.stock,
        price:           p.price,
        cost:            p.cost || 0,
        dailySales:      +dailySales.toFixed(3),
        daysOfStockLeft: dailySales > 0 ? Math.ceil(p.stock / dailySales) : null,
        batches:         batchInfo,
      };
    });

    // Pre-filter: products with any risk signal
    const atRisk = analysis.filter(p =>
      p.batches.some(b => b.daysToExpiry !== null && b.daysToSell !== null && b.daysToSell > b.daysToExpiry) ||
      (p.daysOfStockLeft !== null && p.daysOfStockLeft > 120) ||
      (p.dailySales === 0 && p.currentStock > 5)
    );

    if (atRisk.length === 0) {
      return res.json({ suggestions: [], message: "All products are selling at a healthy pace — no urgent offers needed." });
    }

    const prompt = `You are a retail business AI advisor. Analyze these products and generate promotional offer suggestions to help the store sell products before they expire or become overstock.

TODAY: ${new Date().toISOString().slice(0, 10)}

Products needing attention (${atRisk.length}):
${JSON.stringify(atRisk, null, 2)}

Rules:
- If daysToSell > daysToExpiry for a batch → expiry risk (high urgency)
- If daysOfStockLeft > 90 → slow moving (medium urgency)
- If dailySales === 0 and currentStock > 5 → not selling at all (high urgency)
- margin = price - cost, never suggest offer that makes margin negative
- Be specific with offer values (e.g. 20% off, buy 2 get 1, etc.)

Return ONLY a valid JSON array, no other text:
[
  {
    "productId": "string",
    "productName": "string",
    "urgency": "high|medium|low",
    "offerType": "discount_percent|discount_fixed|buy_x_get_y|bundle",
    "offerValue": 20,
    "offerTitle": "short catchy title",
    "reasoning": "1-2 sentence explanation",
    "suggestedDuration": "e.g. 7 days",
    "expectedImpact": "e.g. Sell 30 units in 7 days"
  }
]`;

    const raw = await gemini(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return res.json({ suggestions: [], message: "AI could not generate suggestions at this time." });

    const suggestions = JSON.parse(match[0]).map(s => {
      const product = analysis.find(p => p.productId === s.productId);
      return { ...s, currentStock: product?.currentStock, dailySales: product?.dailySales, price: product?.price, cost: product?.cost };
    });

    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── REORDER SUGGESTIONS ─────────────────────────────────────────────────── */
export const getReorderSuggestions = async (req, res) => {
  try {
    const storeId   = req.storeId;
    const products  = await Product.find({ storeId });
    const suppliers = await Supplier.find({ storeId });
    const velocity  = await salesVelocity(storeId, 30);

    const TARGET_DAYS = 30;
    const LEAD_TIME   = 7;

    const analysis = products.map(p => {
      const id         = p._id.toString();
      const dailySales = velocity[id] || 0;
      const daysLeft   = dailySales > 0 ? p.stock / dailySales : null;
      const reorder    = dailySales * (LEAD_TIME + 3);
      const suggested  = dailySales > 0 ? Math.ceil(dailySales * TARGET_DAYS - p.stock) : 0;

      return {
        productId:       id,
        name:            p.name,
        currentStock:    p.stock,
        avgDailySales:   +dailySales.toFixed(3),
        daysOfStockLeft: daysLeft ? +daysLeft.toFixed(1) : null,
        reorderPoint:    +reorder.toFixed(1),
        suggestedQty:    Math.max(0, suggested),
        lastCost:        p.cost || 0,
      };
    });

    const needsReorder = analysis.filter(p =>
      p.avgDailySales > 0 && p.suggestedQty > 0 && (p.daysOfStockLeft === null || p.daysOfStockLeft < TARGET_DAYS)
    );

    if (needsReorder.length === 0) {
      return res.json({ items: [], message: "All products have sufficient stock for the next 30 days." });
    }

    const prompt = `You are a procurement AI for a retail store. Review these reorder recommendations and refine them. Add priority, adjust quantities if needed, and provide reasoning.

TODAY: ${new Date().toISOString().slice(0, 10)}
TARGET: 30 days of stock after receiving order (lead time ~7 days)

Products needing reorder (${needsReorder.length}):
${JSON.stringify(needsReorder, null, 2)}

Rules:
- urgent = daysOfStockLeft < 7
- normal = 7–20 days left
- low = 20–30 days left
- If avgDailySales is high, increase suggested qty slightly for buffer
- Round quantities to sensible numbers (not 23.7 → use 24 or 25)

Return ONLY a valid JSON array:
[
  {
    "productId": "string",
    "productName": "string",
    "currentStock": number,
    "avgDailySales": number,
    "daysOfStockLeft": number,
    "suggestedQty": number,
    "lastCost": number,
    "priority": "urgent|normal|low",
    "reasoning": "1-2 sentence explanation"
  }
]`;

    const raw  = await gemini(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    const items = match ? JSON.parse(match[0]) : needsReorder;

    res.json({ items, supplierOptions: suppliers.map(s => ({ _id: s._id, name: s.name })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PURCHASE ORDER CRUD ─────────────────────────────────────────────────── */
export const savePurchaseOrder = async (req, res) => {
  try {
    const { items, notes, aiSummary } = req.body;
    const storeId = req.storeId;

    const enrichedItems = items.map(i => ({
      ...i,
      approvedQty:   i.approvedQty ?? i.suggestedQty,
      estimatedCost: (i.approvedQty ?? i.suggestedQty) * (i.lastCost || 0),
    }));

    const totalEstimatedCost = enrichedItems.reduce((s, i) => s + (i.estimatedCost || 0), 0);

    const order = await PurchaseOrder.create({
      storeId, userId: req.user._id,
      status: "pending", generatedByAI: true,
      aiSummary: aiSummary || "",
      items: enrichedItems,
      totalEstimatedCost: +totalEstimatedCost.toFixed(2),
      notes: notes || "",
    });

    res.status(201).json({ message: "Purchase order saved", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ storeId: req.storeId }).sort({ createdAt: -1 }).limit(100);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status === "approved" && !update.approvedAt) update.approvedAt = new Date();
    if (update.status === "ordered"  && !update.orderedAt)  update.orderedAt  = new Date();
    if (update.status === "received" && !update.receivedAt) update.receivedAt = new Date();

    const order = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId }, update, { new: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    await PurchaseOrder.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
