import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  productId:     { type: mongoose.Schema.Types.ObjectId, ref: "Product" },      // inventory item (stock deducted)
  menuItemId:    { type: mongoose.Schema.Types.ObjectId, ref: "CafeMenuItem" }, // café menu item (no stock)
  name:          { type: String, required: true },
  price:         { type: Number, required: true },
  quantity:      { type: Number, default: 1 },
  modifiers:     [{ type: String }],
  notes:         { type: String, default: "" },
  status:        { type: String, enum: ["pending", "preparing", "ready", "served", "cancelled"], default: "pending" },
  sentToKitchen: { type: Boolean, default: false },
}, { _id: true });

const cafeOrderSchema = new mongoose.Schema({
  storeId:       { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
  tableId:       { type: mongoose.Schema.Types.ObjectId, ref: "CafeTable", default: null },
  tableNumber:   { type: Number, default: null },
  orderType:     { type: String, enum: ["table", "takeaway"], default: "table" },
  label:         { type: String, default: "" },
  openedBy:      { type: mongoose.Schema.Types.ObjectId },
  status:        { type: String, enum: ["open", "closed", "cancelled"], default: "open" },
  items:         [itemSchema],
  serviceCharge: { type: Number, default: 0 },
  discount:      { type: Number, default: 0 },
  notes:         { type: String, default: "" },
  openedAt:      { type: Date, default: Date.now },
  closedAt:      { type: Date },
  saleId:        { type: mongoose.Schema.Types.ObjectId, ref: "Sale", default: null },
}, { timestamps: true });

export default mongoose.model("CafeOrder", cafeOrderSchema);
