import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  productId:    { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName:  String,
  currentStock: Number,
  avgDailySales: Number,
  daysOfStockLeft: Number,
  suggestedQty: Number,
  approvedQty:  Number,
  lastCost:     Number,
  estimatedCost: Number,
  supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  supplierName: String,
  notes:        String,
  priority:     { type: String, enum: ["urgent", "normal", "low"], default: "normal" },
  aiReasoning:  String,
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  storeId:            { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  orderNumber:        String,
  status:             { type: String, enum: ["draft", "pending", "approved", "ordered", "received", "cancelled"], default: "pending" },
  generatedByAI:      { type: Boolean, default: false },
  aiSummary:          String,
  items:              [itemSchema],
  totalEstimatedCost: { type: Number, default: 0 },
  notes:              String,
  approvedAt:         Date,
  orderedAt:          Date,
  receivedAt:         Date,
}, { timestamps: true });

purchaseOrderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const count = await mongoose.model("AIPurchaseOrder").countDocuments({ storeId: this.storeId });
    this.orderNumber = `PO-${String(count + 1).padStart(4, "0")}`;
  }
});

export default mongoose.model("AIPurchaseOrder", purchaseOrderSchema);
