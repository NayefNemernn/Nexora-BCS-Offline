import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    storeId:      { type: mongoose.Schema.Types.ObjectId, ref: "Store",    required: true },
    productId:    { type: mongoose.Schema.Types.ObjectId, ref: "Product",  required: true },
    batchNumber:  { type: String }, // auto: BAT-0001

    supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    supplierName: { type: String, default: "" },

    expiryDate:   { type: Date, default: null },
    receivedDate: { type: Date, default: Date.now },

    initialQty:   { type: Number, required: true, min: 1 },
    remainingQty: { type: Number, required: true, min: 0 },

    costPrice:    { type: Number, default: 0 },
    notes:        { type: String, default: "" },
  },
  { timestamps: true }
);

batchSchema.pre("save", async function (next) {
  if (!this.batchNumber) {
    const count = await mongoose.model("Batch").countDocuments({ storeId: this.storeId });
    this.batchNumber = `BAT-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

batchSchema.index({ storeId: 1, productId: 1 });
batchSchema.index({ storeId: 1, expiryDate: 1 });
batchSchema.index({ storeId: 1, remainingQty: 1 });

export default mongoose.model("Batch", batchSchema);
