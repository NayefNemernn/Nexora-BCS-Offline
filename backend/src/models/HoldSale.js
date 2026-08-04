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

    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        name:      String,
        price:     Number,
        quantity:  Number,
      },
    ],

    total:   Number,
    paid:    { type: Number, default: 0 },
    balance: Number,
    // "paid" accounts are kept (not deleted) so period reports can still
    // count the credit that was issued, even after it's fully settled.
    status:  { type: String, enum: ["open", "paid"], default: "open" },

    payments: [
      {
        amount: Number,
        method: String,
        notes:  String,
        date:   { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

holdSaleSchema.index({ storeId: 1 });

export default mongoose.model("HoldSale", holdSaleSchema);