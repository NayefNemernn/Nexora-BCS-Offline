import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },

    name:    { type: String, required: true, trim: true },
    phone:   { type: String, default: "", trim: true },
    email:   { type: String, default: "", trim: true, lowercase: true },
    address: { type: String, default: "" },
    notes:   { type: String, default: "" },

    // ── Financials ────────────────────────────────────────────
    totalSpent:         { type: Number, default: 0 },
    totalOrders:        { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },
    creditLimit:        { type: Number, default: 0 },   // 0 = no limit

    // ── Loyalty ───────────────────────────────────────────────
    loyaltyPoints:      { type: Number, default: 0 },   // 1 point per $1 spent
    totalPointsEarned:  { type: Number, default: 0 },
    totalPointsRedeemed:{ type: Number, default: 0 },

    // ── Online account ────────────────────────────────────────
    password:            { type: String, default: "", select: false },
    locationDescription: { type: String, default: "" },
    lat:                 { type: Number, default: null },
    lng:                 { type: Number, default: null },
    savedAddresses: [{
      label:               { type: String, default: "" },
      address:             { type: String, default: "" },
      locationDescription: { type: String, default: "" },
      lat:                 { type: Number, default: null },
      lng:                 { type: Number, default: null },
    }],

    // ── Status ────────────────────────────────────────────────
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ storeId: 1 });
customerSchema.index({ storeId: 1, phone: 1 });
customerSchema.index({ storeId: 1, name: "text" });

export default mongoose.model("Customer", customerSchema);