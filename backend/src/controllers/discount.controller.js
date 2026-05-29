// discount.controller.js
import Discount from "../models/Discount.js";

export const getDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find({ storeId: req.storeId }).sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createDiscount = async (req, res) => {
  try {
    const { name, code, type, value, minOrder, maxUses, expiresAt, appliesTo, targetId } = req.body;
    if (!name || !type || value === undefined) return res.status(400).json({ message: "name, type and value are required" });

    // Check code uniqueness within store
    if (code) {
      const existing = await Discount.findOne({ storeId: req.storeId, code: code.toUpperCase() });
      if (existing) return res.status(400).json({ message: "Coupon code already exists" });
    }

    const discount = await Discount.create({
      storeId: req.storeId, name, code: code?.toUpperCase() || "", type, value,
      minOrder: minOrder || 0, maxUses: maxUses || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      appliesTo: appliesTo || "all", targetId: targetId || null,
    });
    res.status(201).json(discount);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      req.body, { new: true }
    );
    if (!discount) return res.status(404).json({ message: "Discount not found" });
    res.json(discount);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteDiscount = async (req, res) => {
  try {
    await Discount.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
    res.json({ message: "Discount deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return res.status(400).json({ message: "code required" });

    const discount = await Discount.findOne({ storeId: req.storeId, code: code.toUpperCase(), active: true });
    if (!discount) return res.status(404).json({ message: "Invalid coupon code" });
    if (discount.expiresAt && discount.expiresAt < new Date()) return res.status(400).json({ message: "Coupon has expired" });
    if (discount.maxUses && discount.usedCount >= discount.maxUses) return res.status(400).json({ message: "Coupon usage limit reached" });
    if (orderTotal < discount.minOrder) return res.status(400).json({ message: `Minimum order $${discount.minOrder} required` });

    const discountAmount = discount.type === "percent"
      ? +(Math.min((discount.value / 100) * orderTotal, orderTotal)).toFixed(2)
      : +Math.min(discount.value, orderTotal).toFixed(2);

    // Increment usage counter
    await Discount.findByIdAndUpdate(discount._id, { $inc: { usedCount: 1 } });

    res.json({ discount, discountAmount });
  } catch (err) { res.status(500).json({ message: err.message }); }
};