import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    storeId:    { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    name:       { type: String, required: true, trim: true },
    code:       { type: String, trim: true, uppercase: true, default: "" }, // coupon code
    type:       { type: String, enum: ["fixed", "percent"], required: true },
    value:      { type: Number, required: true, min: 0 },
    minOrder:   { type: Number, default: 0 },       // min order value to apply
    maxUses:    { type: Number, default: null },     // null = unlimited
    usedCount:  { type: Number, default: 0 },
    active:     { type: Boolean, default: true },
    expiresAt:  { type: Date, default: null },
    appliesTo:  { type: String, enum: ["all", "category", "product"], default: "all" },
    targetId:   { type: mongoose.Schema.Types.ObjectId, default: null }, // category or product id
  },
  { timestamps: true }
);

discountSchema.index({ storeId: 1, active: 1 });
discountSchema.index({ storeId: 1, code: 1 });

export default mongoose.model("Discount", discountSchema);