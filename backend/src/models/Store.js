import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    name:       { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo:       { type: String, default: "" },

    // ── Owner (the admin who created/owns this store) ─────────
    // null for cafe-only stores (no market POS user)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // ── Store type ────────────────────────────────────────────
    storeType: {
      type:    String,
      enum:    ["market", "cafe", "both"],
      default: "market",
    },

    // ── Business Info ─────────────────────────────────────────
    address:    { type: String, default: "" },
    phone:      { type: String, default: "" },
    email:      { type: String, default: "" },
    taxNumber:  { type: String, default: "" },

    // ── Settings ─────────────────────────────────────────────
    currency:       { type: String, default: "USD" },
    currencySymbol: { type: String, default: "$" },
    taxRate:        { type: Number, default: 0, min: 0, max: 100 }, // percentage
    language:       { type: String, default: "en" },
    theme:          { type: String, default: "light" },
    receiptFooter:  { type: String, default: "" },

    // ── Subscription / Plan ───────────────────────────────────
    plan: {
      type:    String,
      enum:    ["trial", "basic", "pro", "enterprise"],
      default: "trial",
    },
    planExpiresAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }, // 14-day trial
    maxUsers:      { type: Number, default: 2 },  // cashiers allowed
    maxProducts:   { type: Number, default: 100 },

    // ── Online Store ──────────────────────────────────────────
    isOnlineStoreActive:      { type: Boolean, default: false },
    deliveryFee:              { type: Number, default: 0 },
    minimumOrder:             { type: Number, default: 0 },
    deliveryTimeMin:          { type: Number, default: 30 },  // minutes
    deliveryTimeMax:          { type: Number, default: 60 },  // minutes
    pointsEnabled:            { type: Boolean, default: false },
    pointsPerUnit:            { type: Number, default: 1 },   // points earned per currency unit

    // ── Delivery contact ──────────────────────────────────────
    deliveryPhone: { type: String, default: "" },

    // ── Telegram delivery notifications ───────────────────────
    telegramBotToken:    { type: String, default: "" },
    adminTelegramChatId: { type: String, default: "" },
    deliveryDrivers:  {
      type: [{ name: { type: String, default: "" }, chatId: { type: String, default: "" } }],
      default: [],
    },

    // ── Café Module ───────────────────────────────────────────
    cafeEnabled:        { type: Boolean, default: false },
    cafePointsPerItem:  { type: Number, default: 10 },

    // ── Offline License (client installations only) ───────────
    // Stores created from a .nexora license file have these set.
    // Stores created directly (superadmin's own machine) leave them null.
    licenseId:         { type: String,  default: null },
    licenseSignature:  { type: String,  default: null },
    licenseIssuedAt:   { type: Date,    default: null },  // floor for clock-rollback check
    licenseExpiresAt:  { type: Date,    default: null },
    lastVerifiedAt:    { type: Date,    default: null },  // updated on every login
    maxLicenseDevices: { type: Number,  default: 1 },
    allowedMACs:       [{ type: String }],   // authorized MAC addresses

    // ── Status ────────────────────────────────────────────────
    active: { type: Boolean, default: true },

    // ── SuperAdmin extras ─────────────────────────────────────
    monthlyPrice:   { type: Number, default: null },
    internalNotes:  { type: String, default: "" },
    welcomeMessage: { type: String, default: "" },
    notifications: {
      type: [{
        message:   { type: String, required: true },
        type:      { type: String, enum: ["info", "warning", "success", "error"], default: "info" },
        createdAt: { type: Date, default: Date.now },
        read:      { type: Boolean, default: false },
      }],
      default: [],
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name if not provided
storeSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);
  }
  next();
});

export default mongoose.model("Store", storeSchema);