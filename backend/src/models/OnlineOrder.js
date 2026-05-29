import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name:      { type: String, required: true },
  price:     { type: Number, required: true },
  quantity:  { type: Number, required: true },
  subtotal:  { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    storeId:    { type: mongoose.Schema.Types.ObjectId, ref: "Store",     required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer",  default: null },

    orderNumber: { type: String }, // auto-generated: ORD-0001

    customer: {
      name:                { type: String, required: true },
      phone:               { type: String, required: true },
      address:             { type: String, default: "" },
      locationDescription: { type: String, default: "" }, // building, floor, landmark
      lat:                 { type: Number, default: null },
      lng:                 { type: Number, default: null },
      notes:               { type: String, default: "" },
    },

    // Driver assignment
    assignedDriver: {
      name:   { type: String, default: "" },
      chatId: { type: String, default: "" },
    },
    // Telegram message IDs sent to each driver (for editing after assignment)
    driverMessageIds: {
      type: [{ chatId: String, messageId: Number }],
      default: [],
    },

    items:       { type: [orderItemSchema], required: true },
    subtotal:    { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    discount:    { type: Number, default: 0 },
    tipAmount:   { type: Number, default: 0 },
    total:       { type: Number, required: true },

    // Promo code applied
    promoCode: {
      code:           { type: String, default: "" },
      discountType:   { type: String, default: "" }, // percent | fixed
      discountValue:  { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },

    // Points offer redeemed
    redeemedOffer: {
      offerId:        { type: mongoose.Schema.Types.ObjectId, ref: "PointsOffer", default: null },
      offerName:      { type: String, default: "" },
      pointsCost:     { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },

    pointsEarned:   { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },

    // null = ASAP
    scheduledFor: { type: Date, default: null },

    status: {
      type:    String,
      enum:    ["pending", "accepted", "rejected", "out_for_delivery", "pending_payment", "completed", "cancelled"],
      default: "pending",
    },

    paymentMethod:   { type: String, default: "cash_on_delivery" },
    paymentStatus:   { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
    rejectionReason: { type: String, default: "" },

    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", default: null },
  },
  { timestamps: true }
);

// Auto-generate orderNumber before first save
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("OnlineOrder").countDocuments({ storeId: this.storeId });
    this.orderNumber = `ORD-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, status: 1 });

export default mongoose.model("OnlineOrder", orderSchema);
