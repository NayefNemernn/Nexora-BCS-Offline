import mongoose from "mongoose";

const stockLogSchema = new mongoose.Schema(
  {
    storeId:   { type: mongoose.Schema.Types.ObjectId, ref: "Store",   required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    productName: { type: String },

    type: {
      type: String,
      enum: ["sale", "return", "manual_add", "manual_remove", "adjustment", "import", "warehouse_in", "warehouse_transfer", "batch_received"],
      required: true,
    },

    quantityBefore: { type: Number, required: true },
    change:         { type: Number, required: true }, // positive = added, negative = removed
    quantityAfter:  { type: Number, required: true },

    reason:    { type: String, default: "" }, // e.g. "damaged", "recount", "supplier"
    reference: { type: String, default: "" }, // e.g. sale ID
  },
  { timestamps: true }
);

stockLogSchema.index({ storeId: 1, createdAt: -1 });
stockLogSchema.index({ storeId: 1, productId: 1 });

export default mongoose.model("StockLog", stockLogSchema);