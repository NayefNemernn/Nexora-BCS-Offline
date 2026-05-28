import mongoose from "mongoose";
import bcrypt    from "bcryptjs";

const cafeStaffSchema = new mongoose.Schema({
  storeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true, index: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  name:     { type: String, required: true, trim: true },
  role:     { type: String, enum: ["manager", "staff"], default: "staff" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

cafeStaffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("CafeStaff", cafeStaffSchema);
