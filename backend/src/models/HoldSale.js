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