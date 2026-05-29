import mongoose from "mongoose";

const cafeRewardSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
  name:          { type: String, required: true, trim: true },
  description:   { type: String, default: "" },
  pointsCost:    { type: Number, required: true, min: 1 },
  rewardType:    { type: String, enum: ["free_item", "discount_percent", "discount_amount"], required: true },
  value:         { type: Number, default: 0 },
  menuItemId:    { type: mongoose.Schema.Types.ObjectId, ref: "CafeMenuItem", default: null },
  menuItemName:  { type: String, default: "" },
  isActive:      { type: Boolean, default: true },
  redemptionCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("CafeReward", cafeRewardSchema);
