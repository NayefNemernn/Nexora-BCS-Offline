import PointsOffer from "../models/PointsOffer.js";
import Store       from "../models/Store.js";

/* ── GET /api/public/:slug/points-offers  (public) ──────────── */
export const getPublicOffers = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const now = new Date();
    const offers = await PointsOffer.find({
      storeId:  store._id,
      isActive: true,
      $or: [{ validUntil: null }, { validUntil: { $gt: now } }],
    }).sort({ pointsCost: 1 });

    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/points-offers  (admin) ─────────────────────────── */
export const getAdminOffers = async (req, res) => {
  try {
    const offers = await PointsOffer.find({ storeId: req.storeId }).sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── POST /api/points-offers  (admin) ────────────────────────── */
export const createOffer = async (req, res) => {
  try {
    const { name, description, pointsCost, offerType, offerValue, isActive, validUntil } = req.body;
    if (!name?.trim())         return res.status(400).json({ message: "Name is required" });
    if (!pointsCost || pointsCost < 1) return res.status(400).json({ message: "Points cost must be at least 1" });
    if (!["discount_percent", "discount_fixed", "free_delivery"].includes(offerType))
      return res.status(400).json({ message: "Invalid offer type" });

    const offer = await PointsOffer.create({
      storeId:    req.storeId,
      name:       name.trim(),
      description: description || "",
      pointsCost,
      offerType,
      offerValue: offerValue || 0,
      isActive:   isActive !== false,
      validUntil: validUntil || null,
    });
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PUT /api/points-offers/:id  (admin) ─────────────────────── */
export const updateOffer = async (req, res) => {
  try {
    const { name, description, pointsCost, offerType, offerValue, isActive, validUntil } = req.body;
    const update = {};
    if (name        !== undefined) update.name        = name.trim();
    if (description !== undefined) update.description = description;
    if (pointsCost  !== undefined) update.pointsCost  = pointsCost;
    if (offerType   !== undefined) update.offerType   = offerType;
    if (offerValue  !== undefined) update.offerValue  = offerValue;
    if (isActive    !== undefined) update.isActive    = isActive;
    if (validUntil  !== undefined) update.validUntil  = validUntil || null;

    const offer = await PointsOffer.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { $set: update },
      { new: true }
    );
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── DELETE /api/points-offers/:id  (admin) ──────────────────── */
export const deleteOffer = async (req, res) => {
  try {
    const offer = await PointsOffer.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
