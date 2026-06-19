import Store from "../models/Store.js";

const UNLOCK_CODE = "03037808";

/* ─────────────────────────────────────────────
   GET COFFEE EXPRESS STATUS
   GET /api/coffee-express/status
───────────────────────────────────────────── */
export const getCoffeeExpressStatus = async (req, res) => {
  try {
    const store = await Store.findById(req.storeId).select("coffeeExpressEnabled");
    res.json({ enabled: !!store?.coffeeExpressEnabled });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────
   UNLOCK COFFEE EXPRESS
   POST /api/coffee-express/unlock
   Body: { code }
───────────────────────────────────────────── */
export const unlockCoffeeExpress = async (req, res) => {
  try {
    const code = (req.body.code || "").trim();
    if (code !== UNLOCK_CODE) {
      return res.status(400).json({ message: "Invalid code." });
    }

    const store = await Store.findByIdAndUpdate(
      req.storeId,
      { coffeeExpressEnabled: true },
      { new: true }
    ).select("coffeeExpressEnabled");

    res.json({ message: "Coffee Express unlocked!", enabled: store.coffeeExpressEnabled });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
