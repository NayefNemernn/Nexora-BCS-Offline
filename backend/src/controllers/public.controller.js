import Store      from "../models/Store.js";
import Product    from "../models/Product.js";
import Category   from "../models/Category.js";

/* ── GET /api/public/:slug ─────────────────────────────────── */
export const getStoreInfo = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true });
    if (!store)                     return res.status(404).json({ message: "Store not found" });
    if (!store.isOnlineStoreActive) return res.status(403).json({ message: "Online store is not active" });

    res.json({
      name:            store.name,
      logo:            store.logo,
      address:         store.address,
      phone:           store.phone,
      currency:        store.currency,
      currencySymbol:  store.currencySymbol,
      deliveryFee:     store.deliveryFee,
      minimumOrder:    store.minimumOrder,
      deliveryTimeMin: store.deliveryTimeMin || 30,
      deliveryTimeMax: store.deliveryTimeMax || 60,
      pointsEnabled:   store.pointsEnabled || false,
      pointsPerUnit:   store.pointsPerUnit  || 1,
      slug:            store.slug,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/public/:slug/products ────────────────────────── */
export const getPublicProducts = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, active: true });
    if (!store)                     return res.status(404).json({ message: "Store not found" });
    if (!store.isOnlineStoreActive) return res.status(403).json({ message: "Online store is not active" });

    const products = await Product.find({
      storeId:           store._id,
      active:            true,
      isAvailableOnline: true,
      stock:             { $gt: 0 },
    })
      .populate("category", "name")
      .sort({ name: 1 });

    const categories = await Category.find({ storeId: store._id }).sort({ name: 1 });

    res.json({ products, categories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
