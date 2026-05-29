import Store from "../models/Store.js";
import User from "../models/User.js";

/* ─────────────────────────────────────────────
   GET MY STORE
   GET /api/store
───────────────────────────────────────────── */
export const getMyStore = async (req, res) => {
  try {
    const store = await Store.findById(req.storeId).populate("owner", "username");
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────
   UPDATE STORE SETTINGS
   PUT /api/store
───────────────────────────────────────────── */
export const updateStore = async (req, res) => {
  try {
    const allowed = [
      "name", "address", "phone", "email", "taxNumber",
      "currency", "currencySymbol", "taxRate",
      "language", "theme", "receiptFooter", "logo",
    ];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const store = await Store.findByIdAndUpdate(req.storeId, updates, { new: true });
    res.json({ message: "Store updated", store });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────
   ADD CASHIER TO STORE
   POST /api/store/users
   Body: { username, password, maxDevices? }
───────────────────────────────────────────── */
export const addCashier = async (req, res) => {
  try {
    const store = req.store;

    // Enforce plan limit
    const currentUsers = await User.countDocuments({ storeId: store._id, active: true });
    if (currentUsers >= store.maxUsers) {
      return res.status(403).json({
        message: `Your plan allows max ${store.maxUsers} users. Upgrade to add more.`,
      });
    }

    const { username, password, maxDevices } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "username and password required" });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ message: "Username already taken" });

    const cashier = await User.create({
      username,
      password,
      role:       "cashier",
      storeId:    store._id,
      maxDevices: maxDevices || 1,
    });

    res.status(201).json({
      message: "Cashier added",
      user: { id: cashier._id, username: cashier.username, role: cashier.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────
   UPDATE CASHIER
   PUT /api/store/users/:id
───────────────────────────────────────────── */
export const updateCashier = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { active, maxDevices, password } = req.body;
    if (active    !== undefined) user.active     = active;
    if (maxDevices !== undefined) user.maxDevices = maxDevices;
    if (password)                 user.password   = password; // pre-save hook will hash it

    await user.save();
    res.json({ message: "User updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─────────────────────────────────────────────
   REMOVE CASHIER (soft delete)
   DELETE /api/store/users/:id
───────────────────────────────────────────── */
export const removeCashier = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Never delete the admin/owner
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot remove store owner" });
    }

    user.active = false;
    await user.save();
    res.json({ message: "User removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};