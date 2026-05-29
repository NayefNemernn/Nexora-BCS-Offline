import mongoose from "mongoose";

const pointsOfferSchema = new mongoose.Schema({
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  pointsCost:  { type: Number, required: true, min: 1 },
  offerType:   { type: String, enum: ["discount_percent", "discount_fixed", "free_delivery"], required: true },
  offerValue:  { type: Number, default: 0 }, // ignored for free_delivery
  isActive:    { type: Boolean, default: true },
  validUntil:  { type: Date, default: null },
  usedCount:   { type: Number, default: 0 },
}, { timestamps: true });

pointsOfferSchema.index({ storeId: 1 });

export default mongoose.model("PointsOffer", pointsOfferSchema);
