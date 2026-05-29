import mongoose from "mongoose";

const denominationSchema = new mongoose.Schema({
  value:    { type: Number, required: true }, // e.g. 100000
  label:    { type: String, required: true }, // e.g. "100k"
  count:    { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
}, { _id: false });

const shiftSchema = new mongoose.Schema(
  {
    storeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    username: { type: String },

    openedAt:  { type: Date, default: Date.now },
    closedAt:  { type: Date, default: null },

    openingFloat:  { type: Number, default: 0 },
    closingCount:  { type: Number, default: null },
    expectedCash:  { type: Number, default: 0 },
    variance:      { type: Number, default: null },

    // ── Cash Drawer Denominations ─────────────────────────────
    openingDenominations:  { type: [denominationSchema], default: [] },
    closingDenominations:  { type: [denominationSchema], default: [] },

    // ── Cash Drawer Events ────────────────────────────────────
    cashDrawerEvents: {
      type: [{
        type:      { type: String, enum: ["open", "paid_in", "paid_out"], default: "open" },
        amount:    { type: Number, default: 0 },
        reason:    { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      }],
      default: [],
    },
    paidIn:   { type: Number, default: 0 },  // cash added to drawer mid-shift
    paidOut:  { type: Number, default: 0 },  // cash removed from drawer mid-shift

    totalSales:            { type: Number, default: 0 },
    totalOrders:           { type: Number, default: 0 },
    cashSales:             { type: Number, default: 0 },
    cardSales:             { type: Number, default: 0 },
    payLaterSales:         { type: Number, default: 0 },
    bankTransferSales:     { type: Number, default: 0 },
    cashOnDeliverySales:   { type: Number, default: 0 },
    inStoreSales:          { type: Number, default: 0 },
    deliverySales:         { type: Number, default: 0 },
    totalRefunds:          { type: Number, default: 0 },
    totalDiscount:         { type: Number, default: 0 },
    netRevenue:            { type: Number, default: 0 },

    notes:  { type: String, default: "" },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

shiftSchema.index({ storeId: 1, status: 1 });
shiftSchema.index({ storeId: 1, openedAt: -1 });

export default mongoose.model("Shift", shiftSchema);