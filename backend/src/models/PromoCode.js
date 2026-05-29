import mongoose from "mongoose";

const promoSchema = new mongoose.Schema({
  storeId:    { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  code:       { type: String, required: true, trim: true },
  type:       { type: String, enum: ["percent", "fixed"], required: true },
  value:      { type: Number, required: true, min: 0 },
  minOrder:   { type: Number, default: 0 },
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usedCount:  { type: Number, default: 0 },
  isActive:   { type: Boolean, default: true },
  expiresAt:  { type: Date, default: null },
}, { timestamps: true });

promoSchema.index({ storeId: 1, code: 1 }, { unique: true });

export default mongoose.model("PromoCode", promoSchema);
