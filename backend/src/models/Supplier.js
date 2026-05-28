import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String },
  quantity:    { type: Number, required: true, min: 1 },
  costPerUnit: { type: Number, required: true, min: 0 },
  subtotal:    { type: Number },
}, { _id: false });

const supplierSchema = new mongoose.Schema(
  {
    storeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    name:     { type: String, required: true, trim: true },
    phone:    { type: String, default: "" },
    email:    { type: String, default: "" },
    address:  { type: String, default: "" },
    notes:    { type: String, default: "" },
    active:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    storeId:    { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    username:   { type: String },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    supplierName: { type: String, default: "" },
    items:      [purchaseItemSchema],
    totalCost:  { type: Number, default: 0 },
    notes:      { type: String, default: "" },
    status:     { type: String, enum: ["pending", "received", "cancelled"], default: "received" },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ storeId: 1, createdAt: -1 });

export const Supplier      = mongoose.model("Supplier",      supplierSchema);
export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);