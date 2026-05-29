import mongoose from "mongoose";

const cafeMenuItemSchema = new mongoose.Schema({
  storeId:      { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
  name:         { type: String, required: true, trim: true },
  category:     { type: String, enum: ["drinks", "food", "desserts", "extras", "other"], default: "other" },
  price:        { type: Number, required: true, min: 0 },
  description:  { type: String, default: "" },
  isAvailable:  { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("CafeMenuItem", cafeMenuItemSchema);
