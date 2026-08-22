import mongoose from "mongoose";

const holdSaleSchema = new mongoose.Schema(
  {
    storeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
      required: true,
    },

    customerName: String,
    phone:        String,
    creditLimit:  { type: Number, default: 500 },

    // "direct" = created from a pure Pay Later checkout (this is the only
    // record of that purchase — see holdSale.controller.js#createHoldSale).
    // "split" = the paylater portion of a split sale, which already has its
    // own Sale document / return flow — kept out of the return-search so the
    // same physical items can't be restocked through both paths at once.
    source: { type: String, enum: ["direct", "split"], default: "direct" },

    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name:      String,
        price:     Number,
        cost:      { type: Number, default: 0 },
        quantity:  Number,
      },
    ],

    total:   Number,
    paid:    { type: Number, default: 0 },
    balance: Number,
    // "paid" accounts are kept (not deleted) so period reports can still
    // count the credit that was issued, even after it's fully settled.
    // This tracks payment status only — see returnStatus below for returns.
    status:  { type: String, enum: ["open", "paid"], default: "open" },

    payments: [
      {
        amount: Number,
        method: String,
        notes:  String,
        date:   { type: Date, default: Date.now },
      },
    ],

    // ── Return tracking — same shape as Sale, kept on its own field so it
    // doesn't collide with the payment-status meaning of `status` above.
    returnStatus: { type: String, enum: ["none", "partial", "full"], default: "none" },
    returnedItems: [
      {
        productId:  mongoose.Schema.Types.ObjectId,
        name:       String,
        quantity:   Number,
        refundAmount: Number,
        reason:     String,
        returnedAt: { type: Date, default: Date.now },
        returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    totalRefunded: { type: Number, default: 0 },
  },
  { timestamps: true }
);

holdSaleSchema.index({ storeId: 1 });

export default mongoose.model("HoldSale", holdSaleSchema);