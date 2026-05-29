import PromoCode from "../models/PromoCode.js";
import Store     from "../models/Store.js";

/* ── POST /api/public/:slug/promo/validate  (public) ─────────── */
export const validatePromo = async (req, res) => {
  try {
    const { slug } = req.params;
    const { code, subtotal } = req.body;

    if (!code?.trim()) return res.status(400).json({ message: "Promo code is required" });

    const store = await Store.findOne({ slug, active: true });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const promo = await PromoCode.findOne({
      storeId: store._id,
      code:    code.trim().toUpperCase(),
      isActive: true,
    });

    if (!promo) return res.status(404).json({ message: "Invalid promo code" });

    if (promo.expiresAt && new Date() > promo.expiresAt)
      return res.status(400).json({ message: "This promo code has expired" });

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit)
      return res.status(400).json({ message: "Promo code usage limit has been reached" });

    const sub = Number(subtotal) || 0;
    if (promo.minOrder > 0 && sub < promo.minOrder)
      return res.status(400).json({
        message: `Minimum order of ${store.currencySymbol}${promo.minOrder} required for this code`,
      });

    const discount =
      promo.type === "percent"
        ? +((sub * promo.value) / 100).toFixed(2)
        : Math.min(promo.value, sub);

    res.json({
      valid: true,
      promo: {
        _id:   promo._id,
        code:  promo.code,
        type:  promo.type,
        value: promo.value,
      },
      discount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/promos  (admin) ─────────────────────────────────── */
export const getPromos = async (req, res) => {
  try {
    const promos = await PromoCode.find({ storeId: req.storeId }).sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── POST /api/promos  (admin) ────────────────────────────────── */
export const createPromo = async (req, res) => {
  try {
    const { code, type, value, minOrder, usageLimit, isActive, expiresAt } = req.body;
    if (!code?.trim()) return res.status(400).json({ message: "Code is required" });
    if (!["percent", "fixed"].includes(type)) return res.status(400).json({ message: "Type must be percent or fixed" });
    if (value == null || value < 0) return res.status(400).json({ message: "Value must be 0 or more" });

    const promo = await PromoCode.create({
      storeId:    req.storeId,
      code:       code.trim().toUpperCase(),
      type,
      value,
      minOrder:   minOrder   || 0,
      usageLimit: usageLimit || 0,
      isActive:   isActive !== false,
      expiresAt:  expiresAt || null,
    });
    res.status(201).json(promo);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Promo code already exists" });
    res.status(500).json({ message: err.message });
  }
};

/* ── PUT /api/promos/:id  (admin) ─────────────────────────────── */
export const updatePromo = async (req, res) => {
  try {
    const { code, type, value, minOrder, usageLimit, isActive, expiresAt } = req.body;
    const update = {};
    if (code        !== undefined) update.code       = code.trim().toUpperCase();
    if (type        !== undefined) update.type       = type;
    if (value       !== undefined) update.value      = value;
    if (minOrder    !== undefined) update.minOrder   = minOrder;
    if (usageLimit  !== undefined) update.usageLimit = usageLimit;
    if (isActive    !== undefined) update.isActive   = isActive;
    if (expiresAt   !== undefined) update.expiresAt  = expiresAt || null;

    const promo = await PromoCode.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: update },
      { new: true }
    );
    if (!promo) return res.status(404).json({ message: "Promo not found" });
    res.json(promo);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "Promo code already exists" });
    res.status(500).json({ message: err.message });
  }
};

/* ── DELETE /api/promos/:id  (admin) ─────────────────────────── */
export const deletePromo = async (req, res) => {
  try {
    const promo = await PromoCode.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!promo) return res.status(404).json({ message: "Promo not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
