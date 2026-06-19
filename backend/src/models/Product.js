import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  name:   { type: String, required: true }, // e.g. "Red / Large"
  price:  { type: Number, default: null },  // override price, null = use parent price
  stock:  { type: Number, default: 0 },
  barcode:{ type: String, default: "" },
}, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true },
    barcode:    { type: String, required: true },
    price:      { type: Number, required: true, min: 0 },
    cost:       { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, default: null },
    stock:      { type: Number, required: true, min: 0 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "Category",
    },
    image:      { type: String, default: "" },
    imageUrl:   { type: String, default: "" }, // URL-based image (alternative to Supabase upload)
    active:     { type: Boolean, default: true }, // auto-disabled when expired

    // ── Coffee Express (street coffee-cup stand shown on POS) ─
    isCoffeeCup:    { type: Boolean, default: false },
    cupSize:        { type: String, default: "" }, // e.g. "Small" / "Medium" / "Large" — empty = single-size cup
    coffeeCategory: { type: String, default: "" }, // e.g. "Hot" / "Cold" / "Bakery" — menu filter tab

    // ── Variants (sizes, colors, etc.) ────────────────────────
    hasVariants: { type: Boolean, default: false },
    variants:    { type: [variantSchema], default: [] },

    // ── Expiry alert threshold ────────────────────────────────
    expiryAlertDays: { type: Number, default: 180 }, // alert in reports this many days before expiry

    // ── VAT ───────────────────────────────────────────────────
    vatExempt: { type: Boolean, default: false }, // true = no VAT applied (e.g. basic food, medicine)

    // ── Online Store ──────────────────────────────────────────
    isAvailableOnline: { type: Boolean, default: true },

    // ── Warehouse stock ───────────────────────────────────────
    warehouseStock: { type: Number, default: 0, min: 0 },

    // ── Multi-tenancy ─────────────────────────────────────────
    storeId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Store",
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ barcode: 1, storeId: 1 }, { unique: true });
productSchema.index({ storeId: 1, active: 1 });
productSchema.index({ storeId: 1, expiryDate: 1 });

export default mongoose.model("Product", productSchema);