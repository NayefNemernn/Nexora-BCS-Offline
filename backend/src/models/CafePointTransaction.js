import mongoose from "mongoose";

const cafePointTransactionSchema = new mongoose.Schema({
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: "CafeCustomer", required: true, index: true },
  storeId:     { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  type:        { type: String, enum: ["earned", "spent"], required: true },
  amount:      { type: Number, required: true, min: 0 },
  source:      {
    type: String,
    enum: ["game", "order", "checkin", "redemption", "welcome", "rating", "manual", "bonus"],
    required: true,
  },
  description: { type: String, default: "" },
  balanceAfter:{ type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("CafePointTransaction", cafePointTransactionSchema);
