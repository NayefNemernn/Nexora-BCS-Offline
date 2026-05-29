import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // ── Multi-tenancy ─────────────────────────────────────────
    storeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
    },
  },
  { timestamps: true }
);

// Category name unique per store
categorySchema.index({ name: 1, storeId: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);