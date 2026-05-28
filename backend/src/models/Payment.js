import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
  customerName: String,
  phone:        String,
  holdSaleId:   mongoose.Schema.Types.ObjectId,
  amount:       Number,
  method:       String,
  notes:        String,
  createdAt:    { type: Date, default: Date.now },
});

paymentSchema.index({ storeId: 1 });

export default mongoose.model("Payment", paymentSchema);