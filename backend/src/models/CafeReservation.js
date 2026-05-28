import mongoose from "mongoose";

const cafeReservationSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  tableId:      { type: mongoose.Schema.Types.ObjectId, ref: "CafeTable", default: null },
  customerName: { type: String, required: true },
  phone:        { type: String, default: "" },
  partySize:    { type: Number, default: 1 },
  date:         { type: String, required: true },
  time:         { type: String, required: true },
  notes:        { type: String, default: "" },
  status:       { type: String, enum: ["pending", "confirmed", "seated", "cancelled"], default: "pending" },
}, { timestamps: true });

export default mongoose.model("CafeReservation", cafeReservationSchema);
