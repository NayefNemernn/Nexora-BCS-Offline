import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    storeId:     { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
    username:    { type: String },

    title:       { type: String, required: true, trim: true },
    amount:      { type: Number, required: true, min: 0 },
    category:    { type: String, enum: ["rent", "utilities", "salaries", "supplies", "maintenance", "marketing", "transport", "other"], default: "other" },
    paymentMethod: { type: String, enum: ["cash", "card", "bank_transfer"], default: "cash" },
    notes:       { type: String, default: "" },
    date:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

expenseSchema.index({ storeId: 1, date: -1 });
expenseSchema.index({ storeId: 1, category: 1 });

export default mongoose.model("Expense", expenseSchema);