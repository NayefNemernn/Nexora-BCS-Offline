import mongoose from "mongoose";
import bcrypt    from "bcryptjs";

const TIERS = [
  { name: "bronze",  min: 0,     max: 999,   multiplier: 1.0  },
  { name: "silver",  min: 1000,  max: 4999,  multiplier: 1.25 },
  { name: "gold",    min: 5000,  max: 9999,  multiplier: 1.5  },
  { name: "diamond", min: 10000, max: Infinity, multiplier: 2.0 },
];

export const getTier = (points) =>
  TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0];

const cafeCustomerSchema = new mongoose.Schema({
  storeId:             { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
  name:                { type: String, required: true, trim: true },
  phone:               { type: String, required: true, trim: true },
  password:            { type: String, default: null },
  googleId:            { type: String, default: null },
  points:              { type: Number, default: 0, min: 0 },
  tier:                { type: String, enum: ["bronze", "silver", "gold", "diamond"], default: "bronze" },
  lastCheckIn:         { type: Date, default: null },
  welcomeBonusClaimed: { type: Boolean, default: false },
  pendingBonus:        {
    doubleOrderPoints: { type: Boolean, default: false },
    freeAddOn:         { type: String, default: null },
  },
}, { timestamps: true });

/* Unique phone per store */
cafeCustomerSchema.index({ storeId: 1, phone: 1 }, { unique: true });

cafeCustomerSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.tier = getTier(this.points).name;
  next();
});

cafeCustomerSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("CafeCustomer", cafeCustomerSchema);
