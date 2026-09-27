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
        "batch_received", "batch_deleted",
        "stock_adjusted",
        "customer_created", "customer_updated",
        "user_created", "user_updated", "user_deleted",
        "login", "logout",
        "discount_applied",
        "paylater_payment", "paylater_returned", "paylater_opening_balance",
        "expense_created",
        "warehouse_created", "warehouse_add", "warehouse_receive", "warehouse_transfer",
        "warehouse_receive_supplier", "warehouse_move_to", "warehouse_move_from",
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