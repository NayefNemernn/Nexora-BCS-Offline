import mongoose from "mongoose";

const cafeTableSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  number:        { type: Number, required: true },
  shape:         { type: String, enum: ["round", "square", "rectangle"], default: "square" },
  seats:         { type: Number, default: 4 },
  x:             { type: Number, default: 100 },
  y:             { type: Number, default: 100 },
  status:        { type: String, enum: ["available", "occupied", "reserved", "cleaning"], default: "available" },
  color:         { type: String, default: "" },
  activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "CafeOrder", default: null },
}, { timestamps: true });

export default mongoose.model("CafeTable", cafeTableSchema);
