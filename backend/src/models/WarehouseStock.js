import mongoose from "mongoose";

const warehouseStockSchema = new mongoose.Schema(
  {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: "Product",   required: true },
    storeId:     { type: mongoose.Schema.Types.ObjectId, ref: "Store",     required: true },
    quantity:    { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One stock entry per warehouse+product pair
warehouseStockSchema.index({ warehouseId: 1, productId: 1 }, { unique: true });
warehouseStockSchema.index({ storeId: 1, warehouseId: 1 });

export default mongoose.model("WarehouseStock", warehouseStockSchema);
