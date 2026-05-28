import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    storeId:     { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  },
  { timestamps: true }
);

warehouseSchema.index({ storeId: 1 });

export default mongoose.model("Warehouse", warehouseSchema);
