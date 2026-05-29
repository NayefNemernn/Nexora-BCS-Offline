import express from "express";
import User from "../models/User.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

/* ── GET ALL USERS IN STORE with stats ── */
router.get("/", protect, isAdmin, async (req, res) => {
  try {
    const storeId = req.storeId;
    // Find users belonging to this store OR users with no storeId (pre-migration users)
    const users   = await User.find({
      $or: [
        { storeId },
        { storeId: { $exists: false } },
        { storeId: null }
      ],
      role: { $ne: "superadmin" }
    }).select("-password -sessionToken");

    // Auto-link any un-migrated users to this store
    const unlinked = users.filter(u => !u.storeId);
    if (unlinked.length > 0) {
      await User.updateMany(
        { _id: { $in: unlinked.map(u => u._id) } },
        { $set: { storeId } }
      );
    }
    const today   = new Date(); today.setHours(0, 0, 0, 0);

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const [totalSales, todaySales] = await Promise.all([
        Sale.aggregate([{ $match: { storeId, userId: u._id } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
        Sale.aggregate([{ $match: { storeId, userId: u._id, createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      ]);

      return {
        _id:           u._id,
        username:      u.username,
        role:          u.role,
        active:        u.active,
        maxDevices:    u.maxDevices || 1,
        devices:       u.devices   || [],
        lastLoginAt:   u.lastLoginAt,
        lastLoginIP:   u.lastLoginIP,
        createdAt:     u.createdAt,
        isOnline:      (u.devices?.length > 0) || !!u.deviceId,
        activeDevices: u.devices?.length || (u.deviceId ? 1 : 0),
        stats: {
          totalRevenue: totalSales[0]?.total || 0,
          totalOrders:  totalSales[0]?.count || 0,
          todayRevenue: todaySales[0]?.total || 0,
          todayOrders:  todaySales[0]?.count || 0,
        },
      };
    }));

    res.json(usersWithStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET STORE GLOBAL STATS (for admin panel) ── */
router.get("/admin/global-stats", protect, isAdmin, async (req, res) => {
  try {
    const storeId  = req.storeId;
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);

    const [totalUsers, totalProducts, todaySales, monthSales, totalSales, topUsers] = await Promise.all([
      User.countDocuments({ storeId, active: true }),
      Product.countDocuments({ storeId }),
      Sale.aggregate([{ $match: { storeId, createdAt: { $gte: today } } },     { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { storeId, createdAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { storeId } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      Sale.aggregate([
        { $match: { storeId } },
        { $group: { _id: "$userId", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { username: "$user.username", revenue: 1, orders: 1 } },
      ]),
    ]);

    res.json({
      totalUsers, totalProducts,
      todayRevenue:  todaySales[0]?.total  || 0,
      todayOrders:   todaySales[0]?.count  || 0,
      monthRevenue:  monthSales[0]?.total  || 0,
      monthOrders:   monthSales[0]?.count  || 0,
      totalRevenue:  totalSales[0]?.total  || 0,
      totalOrders:   totalSales[0]?.count  || 0,
      topUsers,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── GET USER SALES ── */
router.get("/:id/sales", protect, isAdmin, async (req, res) => {
  try {
    const sales = await Sale.find({ storeId: req.storeId, userId: req.params.id })
      .sort({ createdAt: -1 }).limit(50).select("total paymentMethod createdAt items");
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── CREATE USER (cashier) ── */
router.post("/", protect, isAdmin, async (req, res) => {
  const { username, password, role, maxDevices } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });

  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ message: "Username already taken" });

  const user = await User.create({ username, password, role: role || "cashier", storeId: req.storeId, maxDevices: maxDevices || 1 });
  res.status(201).json({ _id: user._id, username: user.username, role: user.role, active: user.active });
});

/* ── UPDATE USER ── */
router.patch("/:id", protect, isAdmin, async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, storeId: req.storeId });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (req.body.active     !== undefined) user.active     = req.body.active;
  if (req.body.role       !== undefined) user.role       = req.body.role;
  if (req.body.maxDevices !== undefined) user.maxDevices = parseInt(req.body.maxDevices);
  await user.save();
  res.json({ message: "User updated" });
});

/* ── FORCE LOGOUT ALL DEVICES ── */
router.post("/:id/force-logout", protect, isAdmin, async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { _id: req.params.id, storeId: req.storeId },
      { devices: [], deviceId: null, sessionToken: null }
    );
    res.json({ message: "User force logged out from all devices" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── FORCE LOGOUT ONE DEVICE ── */
router.post("/:id/force-logout-device", protect, isAdmin, async (req, res) => {
  try {
    const { deviceId } = req.body;
    const user = await User.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!user) return res.status(404).json({ message: "User not found" });
    user.devices = user.devices.filter(d => d.deviceId !== deviceId);
    if (user.deviceId === deviceId) {
      user.deviceId     = user.devices[0]?.deviceId     || null;
      user.sessionToken = user.devices[0]?.sessionToken || null;
    }
    await user.save();
    res.json({ message: "Device logged out" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── CHANGE PASSWORD ── */
router.post("/:id/change-password", protect, isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: "New password required" });
    const user = await User.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!user) return res.status(404).json({ message: "User not found" });
    user.password = newPassword;
    user.deviceId = null; user.sessionToken = null; user.devices = [];
    await user.save();
    res.json({ message: "Password changed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── DELETE USER ── */
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    // Allow deleting any user except yourself
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(403).json({ message: "Cannot delete your own account" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ── CLEAR STORE SALES ── */
router.delete("/:id/clear-sales", protect, isAdmin, async (req, res) => {
  try {
    const result = await Sale.deleteMany({ storeId: req.storeId, userId: req.params.id });
    res.json({ message: `Deleted ${result.deletedCount} sales`, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;