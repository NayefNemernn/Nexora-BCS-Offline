import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const deviceSchema = new mongoose.Schema({
  deviceId:      { type: String, required: true },
  deviceName:    { type: String, default: null },
  deviceOS:      { type: String, default: null },
  deviceBrowser: { type: String, default: null },
  lastLoginAt:   { type: Date,   default: null },
  lastLoginIP:   { type: String, default: null },
  sessionToken:  { type: String, default: null },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    // ── Roles ──────────────────────────────────────────────────
    // superadmin  → can manage ALL stores (platform owner)
    // admin       → owns/manages one store
    // cashier     → works in a store, limited access
    role: {
      type:    String,
      enum:    ["superadmin", "admin", "cashier"],
      default: "cashier",
    },

    // ── Store membership ──────────────────────────────────────
    // null for superadmin (they belong to no store)
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Store",
      default: null,
    },

    // ── Status ────────────────────────────────────────────────
    active: { type: Boolean, default: true },

    // ── SuperAdmin platform Telegram (for website trial alerts) ─
    platformTelegramBotToken: { type: String, default: "" },
    platformAdminChatId:      { type: String, default: "" },

    // ── Multi-device support ──────────────────────────────────
    maxDevices: { type: Number, default: 1, min: 1, max: 10 },
    devices:    { type: [deviceSchema], default: [] },

    // Legacy single-device fields (kept for backward compat)
    deviceId:      { type: String, default: null },
    deviceName:    { type: String, default: null },
    deviceOS:      { type: String, default: null },
    deviceBrowser: { type: String, default: null },
    lastLoginAt:   { type: Date,   default: null },
    lastLoginIP:   { type: String, default: null },
    sessionToken:  { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (/^\$2[ab]\$/.test(this.password)) return next(); // already bcrypt-hashed (from license file)
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("User", userSchema);