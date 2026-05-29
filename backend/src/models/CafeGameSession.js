import mongoose from "mongoose";

const cafeGameSessionSchema = new mongoose.Schema({
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: "CafeCustomer", required: true, index: true },
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  gameType:      { type: String, enum: ["slot", "scratch", "wheel", "mystery", "trivia"], required: true },
  result:        { type: mongoose.Schema.Types.Mixed, default: {} },
  pointsAwarded: { type: Number, default: 0 },
  isForPoints:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("CafeGameSession", cafeGameSessionSchema);
