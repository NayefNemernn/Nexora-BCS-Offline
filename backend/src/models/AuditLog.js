import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    storeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    username: { type: String },

    action: {
      type: String,
      enum: [
        "sale_created", "sale_returned", "sale_voided",
        "product_created", "product_updated", "product_deleted",
        "stock_adjusted",
        "customer_created", "customer_updated",
        "user_created", "user_updated", "user_deleted",
        "login", "logout",
        "discount_applied",
        "paylater_payment",
        "order_accepted", "order_rejected", "order_payment_confirmed", "order_cancelled",
        "cafe_checkout",
      ],
      required: true,
    },

    // Human-readable summary
    description: { type: String, required: true },

    // Extra context (saleId, productId, old vs new values, etc.)
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ storeId: 1, createdAt: -1 });
auditLogSchema.index({ storeId: 1, action: 1 });

export default mongoose.model("AuditLog", auditLogSchema);