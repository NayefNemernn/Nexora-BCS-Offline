import mongoose from "mongoose";

const cafeOrderRatingSchema = new mongoose.Schema({
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: "CafeOrder", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "CafeCustomer", required: true },
  storeId:    { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  rating:     { type: Number, min: 1, max: 5, required: true },
  comment:    { type: String, default: "" },
}, { timestamps: true });

cafeOrderRatingSchema.index({ orderId: 1, customerId: 1 }, { unique: true });

export default mongoose.model("CafeOrderRating", cafeOrderRatingSchema);
