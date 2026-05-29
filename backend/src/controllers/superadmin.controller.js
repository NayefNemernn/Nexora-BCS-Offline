import Store     from "../models/Store.js";
import User      from "../models/User.js";
import Sale      from "../models/Sale.js";
import Product   from "../models/Product.js";
import AuditLog  from "../models/AuditLog.js";
import Category  from "../models/Category.js";
import CafeStaff from "../models/CafeStaff.js";
import jwt       from "jsonwebtoken";
import { v4 as uuid } from "uuid";

/* ─────────────────────────────────────────────
   PLATFORM STATS
───────────────────────────────────────────── */
export const getPlatformStats = async (req, res) => {
  try {
    const [totalStores, activeStores, totalUsers, totalProducts, revenueAgg] = await Promise.all([
      Store.countDocuments(),
      Store.countDocuments({ active: true }),
      User.countDocuments({ role: { $ne: "superadmin" } }),
      Product.countDocuments(),
      Sale.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
    ]);
    const sixMonthsAgo   = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const storeGrowth    = await Store.aggregate([{ $match: { createdAt: { $gte: sixMonthsAgo } } }, { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
    const revenueByMonth = await Sale.aggregate([{ $match: { createdAt: { $gte: sixMonthsAgo } } }, { $group: { _id: { $month: "$createdAt" }, total: { $sum: "$total" } } }, { $sort: { _id: 1 } }]);
    const planDist       = await Store.aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }]);
    const soon           = new Date(); soon.setDate(soon.getDate() + 7);
    const expiringSoon   = await Store.countDocuments({ planExpiresAt: { $lte: soon, $gte: new Date() }, active: true });
    const expired        = await Store.countDocuments({ planExpiresAt: { $lt: new Date() }, active: true });
    res.json({ totalStores, activeStores, totalUsers, totalProducts, totalRevenue: revenueAgg[0]?.total || 0, storeGrowth, revenueByMonth, planDistribution: planDist, expiringSoon, expired });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   GET ALL STORES
───────────────────────────────────────────── */
export const getAllStores = async (req, res) => {
  try {
    const stores   = await Store.find().populate("owner", "username").sort({ createdAt: -1 });
    const enriched = await Promise.all(stores.map(async (store) => {
      const [userCount, productCount, salesTotal] = await Promise.all([
        User.countDocuments({ storeId: store._id, active: true }),
        Product.countDocuments({ storeId: store._id }),
        Sale.aggregate([{ $match: { storeId: store._id } }, { $group: { _id: null, total: { $sum: "$total" } } }]),
      ]);
      return { ...store.toObject(), userCount, productCount, totalRevenue: salesTotal[0]?.total || 0 };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   GET STORE DETAILS
───────────────────────────────────────────── */
export const getStoreDetails = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id).populate("owner", "username email");
    if (!store) return res.status(404).json({ message: "Store not found" });
    const users        = await User.find({ storeId: store._id }).select("username role active lastLoginAt");
    const products     = await Product.find({ storeId: store._id }).select("name price stock category").populate("category", "name").limit(50).lean();
    const productCount = await Product.countDocuments({ storeId: store._id });
    const last30       = new Date(); last30.setDate(last30.getDate() - 30);
    const salesStats   = await Sale.aggregate([{ $match: { storeId: store._id, createdAt: { $gte: last30 } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]);
    const recentSales  = await Sale.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(10).select("total items createdAt paymentMethod").lean();
    const auditLogs    = await AuditLog.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ store, users, products, productCount, recentSales, auditLogs, last30DaysSales: salesStats[0]?.total || 0, last30DaysOrders: salesStats[0]?.count || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   GET STORE USERS WITH STATS (superadmin)
───────────────────────────────────────────── */
export const getStoreUsers = async (req, res) => {
  try {
    const storeId = req.params.id;
    const store   = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const users = await User.find({ storeId, role: { $ne: "superadmin" } }).select("-password -sessionToken");
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const usersWithStats = await Promise.all(users.map(async (u) => {
      const [totalSales, todaySales, productCount] = await Promise.all([
        Sale.aggregate([{ $match: { storeId: store._id, userId: u._id } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
        Sale.aggregate([{ $match: { storeId: store._id, userId: u._id, createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
        Product.countDocuments({ storeId: store._id }),
      ]);
      return {
        _id: u._id, username: u.username, role: u.role, active: u.active,
        maxDevices: u.maxDevices || 1, devices: u.devices || [],
        lastLoginAt: u.lastLoginAt, lastLoginIP: u.lastLoginIP, createdAt: u.createdAt,
        isOnline: (u.devices?.length > 0) || !!u.deviceId,
        activeDevices: u.devices?.length || (u.deviceId ? 1 : 0),
        stats: {
          totalRevenue: totalSales[0]?.total || 0, totalOrders:  totalSales[0]?.count || 0,
          todayRevenue: todaySales[0]?.total || 0, todayOrders:  todaySales[0]?.count || 0,
          totalProducts: productCount,
        },
      };
    }));
    res.json(usersWithStats);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   GET STORE GLOBAL STATS (superadmin)
───────────────────────────────────────────── */
export const getStoreGlobalStats = async (req, res) => {
  try {
    const storeId   = req.params.id;
    const store     = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const [totalUsers, totalProducts, todaySales, monthSales, totalSales, topUsers] = await Promise.all([
      User.countDocuments({ storeId: store._id, active: true }),
      Product.countDocuments({ storeId: store._id }),
      Sale.aggregate([{ $match: { storeId: store._id, createdAt: { $gte: today } } },     { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { storeId: store._id, createdAt: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { storeId: store._id } }, { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $match: { storeId: store._id } }, { $group: { _id: "$userId", revenue: { $sum: "$total" }, orders: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 5 }, { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } }, { $unwind: "$user" }, { $project: { username: "$user.username", revenue: 1, orders: 1 } }]),
    ]);
    res.json({ totalUsers, totalProducts, todayRevenue: todaySales[0]?.total || 0, todayOrders: todaySales[0]?.count || 0, monthRevenue: monthSales[0]?.total || 0, monthOrders: monthSales[0]?.count || 0, totalRevenue: totalSales[0]?.total || 0, totalOrders: totalSales[0]?.count || 0, topUsers });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CREATE STORE USER (superadmin)
───────────────────────────────────────────── */
export const createStoreUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already taken" });
    const user = await User.create({ username, password, role: role || "cashier", storeId: store._id });
    res.status(201).json({ _id: user._id, username: user.username, role: user.role, active: user.active });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   UPDATE STORE USER (superadmin)
───────────────────────────────────────────── */
export const updateStoreUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, storeId: req.params.id });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (req.body.active     !== undefined) user.active     = req.body.active;
    if (req.body.role       !== undefined) user.role       = req.body.role;
    if (req.body.maxDevices !== undefined) user.maxDevices = parseInt(req.body.maxDevices);
    await user.save();
    res.json({ message: "User updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   DELETE STORE USER (superadmin)
───────────────────────────────────────────── */
export const deleteStoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   FORCE LOGOUT ALL DEVICES (superadmin)
───────────────────────────────────────────── */
export const forceLogoutStoreUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { devices: [], deviceId: null, sessionToken: null });
    res.json({ message: "User force logged out" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   FORCE LOGOUT ONE DEVICE (superadmin)
───────────────────────────────────────────── */
export const forceLogoutStoreDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.devices = user.devices.filter(d => d.deviceId !== deviceId);
    if (user.deviceId === deviceId) { user.deviceId = user.devices[0]?.deviceId || null; user.sessionToken = user.devices[0]?.sessionToken || null; }
    await user.save();
    res.json({ message: "Device logged out" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CHANGE STORE USER PASSWORD (superadmin)
───────────────────────────────────────────── */
export const changeStoreUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: "newPassword required" });
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.password = newPassword; user.deviceId = null; user.sessionToken = null; user.devices = [];
    await user.save();
    res.json({ message: "Password changed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   GET STORE USER SALES (superadmin)
───────────────────────────────────────────── */
export const getStoreUserSales = async (req, res) => {
  try {
    const sales = await Sale.find({ storeId: req.params.id, userId: req.params.userId })
      .sort({ createdAt: -1 }).limit(50).select("total paymentMethod createdAt items");
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CLEAR STORE USER SALES (superadmin)
───────────────────────────────────────────── */
export const clearStoreUserSales = async (req, res) => {
  try {
    const result = await Sale.deleteMany({ storeId: req.params.id, userId: req.params.userId });
    res.json({ message: `Deleted ${result.deletedCount} sales` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CLEAR STORE USER PRODUCTS (superadmin)
───────────────────────────────────────────── */
export const clearStoreUserProducts = async (req, res) => {
  try {
    const result = await Product.deleteMany({ storeId: req.params.id });
    res.json({ message: `Deleted ${result.deletedCount} products` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CREATE STORE
───────────────────────────────────────────── */
export const createStore = async (req, res) => {
  try {
    const {
      storeName, currency, language, plan, maxUsers, maxProducts,
      storeType = "market",
      // market / both credentials
      username, password,
      // cafe / both credentials
      cafeName, cafeUsername, cafePassword,
    } = req.body;

    if (!storeName) return res.status(400).json({ message: "storeName is required" });

    const limits  = { trial: { maxUsers: 2, maxProducts: 100 }, basic: { maxUsers: 5, maxProducts: 500 }, pro: { maxUsers: 20, maxProducts: 2000 }, enterprise: { maxUsers: 100, maxProducts: 99999 } };
    const selPlan = plan || "trial";
    const slug    = storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);

    let adminUser   = null;
    let cafeManager = null;

    /* ── Market admin ── */
    if (storeType === "market" || storeType === "both") {
      if (!username || !password) return res.status(400).json({ message: "Admin username and password are required" });
      if (await User.findOne({ username })) return res.status(400).json({ message: "Username already taken" });
      adminUser = new User({ username, password, role: "admin" });
      await adminUser.save();
    }

    /* ── Store ── */
    const store = await Store.create({
      name:         storeName,
      slug,
      owner:        adminUser?._id || undefined,
      storeType,
      cafeEnabled:  storeType === "cafe" || storeType === "both",
      currency:     currency || "USD",
      language:     language || "en",
      plan:         selPlan,
      maxUsers:     maxUsers     || limits[selPlan].maxUsers,
      maxProducts:  maxProducts  || limits[selPlan].maxProducts,
    });

    if (adminUser) { adminUser.storeId = store._id; await adminUser.save(); }

    /* ── Cafe manager ── */
    if (storeType === "cafe" || storeType === "both") {
      if (!cafeUsername || !cafePassword || !cafeName) return res.status(400).json({ message: "Café manager name, username and password are required" });
      if (await CafeStaff.findOne({ username: cafeUsername.toLowerCase() })) return res.status(400).json({ message: "Café username already taken" });
      cafeManager = await CafeStaff.create({ storeId: store._id, name: cafeName, username: cafeUsername.toLowerCase(), password: cafePassword, role: "manager" });
    }

    res.status(201).json({
      message: "Store created",
      store,
      ...(adminUser   && { admin:       { id: adminUser._id,   username: adminUser.username } }),
      ...(cafeManager && { cafeManager: { id: cafeManager._id, username: cafeManager.username } }),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   DELETE STORE
───────────────────────────────────────────── */
export const deleteStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    await Promise.all([User.deleteMany({ storeId: store._id }), Sale.deleteMany({ storeId: store._id }), Product.deleteMany({ storeId: store._id }), Category.deleteMany({ storeId: store._id }), AuditLog.deleteMany({ storeId: store._id }), Store.findByIdAndDelete(store._id)]);
    res.json({ message: "Store deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   UPDATE PLAN
───────────────────────────────────────────── */
export const updateStorePlan = async (req, res) => {
  try {
    const { plan, expiresAt, maxUsers, maxProducts, monthlyPrice } = req.body;
    const updates = {};
    if (plan)                       updates.plan          = plan;
    if (expiresAt)                  updates.planExpiresAt = new Date(expiresAt);
    if (maxUsers)                   updates.maxUsers      = maxUsers;
    if (maxProducts)                updates.maxProducts   = maxProducts;
    if (monthlyPrice !== undefined) updates.monthlyPrice  = monthlyPrice;
    const store = await Store.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ message: "Plan updated", store });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   TOGGLE STORE
───────────────────────────────────────────── */
export const toggleStoreActive = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.active = !store.active;
    await store.save();
    res.json({ message: `Store ${store.active ? "activated" : "deactivated"}`, active: store.active });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   TOGGLE CAFE MODULE
───────────────────────────────────────────── */
export const toggleCafeEnabled = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.cafeEnabled = !store.cafeEnabled;
    await store.save();
    res.json({ cafeEnabled: store.cafeEnabled });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   RESET ADMIN PASSWORD
───────────────────────────────────────────── */
export const resetAdminPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: "newPassword required" });
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    const admin = await User.findOne({ storeId: store._id, role: "admin" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    admin.password = newPassword; admin.devices = []; admin.deviceId = null; admin.sessionToken = null;
    await admin.save();
    res.json({ message: "Password reset" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CREATE CASHIER
───────────────────────────────────────────── */
export const createCashier = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already taken" });
    const cashier = await User.create({ username, password, role: "cashier", storeId: store._id });
    res.status(201).json({ message: "Cashier created", user: { id: cashier._id, username: cashier.username } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   IMPERSONATE
───────────────────────────────────────────── */
export const impersonateStore = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    const admin = await User.findOne({ storeId: store._id, role: "admin" });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const sessionToken = uuid(); const deviceId = "superadmin-impersonate";
    admin.devices = admin.devices.filter(d => d.deviceId !== deviceId);
    admin.devices.push({ deviceId, deviceName: "SuperAdmin", deviceOS: "Web", deviceBrowser: "SuperAdmin", lastLoginAt: new Date(), lastLoginIP: null, sessionToken });
    await admin.save();
    const token = jwt.sign({ id: admin._id, role: admin.role, storeId: admin.storeId, sessionToken, deviceId }, process.env.JWT_SECRET, { expiresIn: "2h" });
    res.json({ token, user: { id: admin._id, username: admin.username, role: admin.role }, store: { id: store._id, name: store.name, slug: store.slug, currency: store.currency, currencySymbol: store.currencySymbol, language: store.language, theme: store.theme, plan: store.plan, planExpiresAt: store.planExpiresAt } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   SEND NOTIFICATION
───────────────────────────────────────────── */
export const sendNotification = async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    if (!store.notifications) store.notifications = [];
    store.notifications.unshift({ message, type: type || "info", createdAt: new Date(), read: false });
    store.notifications = store.notifications.slice(0, 20);
    store.markModified("notifications");
    await store.save();
    res.json({ message: "Notification sent" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   BULK NOTIFY
───────────────────────────────────────────── */
export const bulkNotify = async (req, res) => {
  try {
    const { message, type, storeIds } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });
    const query  = storeIds?.length ? { _id: { $in: storeIds } } : {};
    const stores = await Store.find(query);
    await Promise.all(stores.map(async (store) => {
      if (!store.notifications) store.notifications = [];
      store.notifications.unshift({ message, type: type || "info", createdAt: new Date(), read: false });
      store.notifications = store.notifications.slice(0, 20);
      store.markModified("notifications");
      await store.save();
    }));
    res.json({ message: `Notification sent to ${stores.length} store(s)` });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   BULK ACTION
───────────────────────────────────────────── */
export const bulkAction = async (req, res) => {
  try {
    const { storeIds, action, days } = req.body;
    if (!storeIds?.length || !action) return res.status(400).json({ message: "storeIds and action required" });
    if (action === "disable") { await Store.updateMany({ _id: { $in: storeIds } }, { active: false }); return res.json({ message: `${storeIds.length} store(s) disabled` }); }
    if (action === "enable")  { await Store.updateMany({ _id: { $in: storeIds } }, { active: true  }); return res.json({ message: `${storeIds.length} store(s) enabled` }); }
    if (action === "extend") {
      const extDays = days || 30;
      const stores  = await Store.find({ _id: { $in: storeIds } });
      await Promise.all(stores.map(async (s) => { const base = s.planExpiresAt && s.planExpiresAt > new Date() ? s.planExpiresAt : new Date(); s.planExpiresAt = new Date(base.getTime() + extDays * 86400000); await s.save(); }));
      return res.json({ message: `${storeIds.length} store(s) extended by ${extDays} days` });
    }
    res.status(400).json({ message: "Invalid action" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   TRANSFER OWNER
───────────────────────────────────────────── */
export const transferOwner = async (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) return res.status(400).json({ message: "newUsername and newPassword required" });
    const store = await Store.findById(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    const existing = await User.findOne({ username: newUsername });
    if (existing) return res.status(400).json({ message: "Username already taken" });
    await User.updateMany({ storeId: store._id, role: "admin" }, { role: "cashier" });
    const newAdmin = await User.create({ username: newUsername, password: newPassword, role: "admin", storeId: store._id });
    store.owner = newAdmin._id; await store.save();
    res.json({ message: "Ownership transferred", newAdmin: { id: newAdmin._id, username: newAdmin.username } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CLONE STORE
───────────────────────────────────────────── */
export const cloneStore = async (req, res) => {
  try {
    const { newStoreName, newUsername, newPassword } = req.body;
    if (!newStoreName || !newUsername || !newPassword) return res.status(400).json({ message: "newStoreName, newUsername and newPassword required" });
    const src = await Store.findById(req.params.id);
    if (!src) return res.status(404).json({ message: "Source store not found" });
    const existing = await User.findOne({ username: newUsername });
    if (existing) return res.status(400).json({ message: "Username already taken" });
    const newAdmin = new User({ username: newUsername, password: newPassword, role: "admin" });
    await newAdmin.save();
    const newStore = await Store.create({ name: newStoreName, owner: newAdmin._id, currency: src.currency, currencySymbol: src.currencySymbol, taxRate: src.taxRate, language: src.language, theme: src.theme, receiptFooter: src.receiptFooter, plan: "trial", maxUsers: 2, maxProducts: 100 });
    const srcCats  = await Category.find({ storeId: src._id });
    if (srcCats.length) await Category.insertMany(srcCats.map(c => ({ name: c.name, storeId: newStore._id })));
    newAdmin.storeId = newStore._id; await newAdmin.save();
    res.status(201).json({ message: "Store cloned", store: { id: newStore._id, name: newStore.name }, admin: { id: newAdmin._id, username: newAdmin.username } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   EXPORT STORES
───────────────────────────────────────────── */
export const exportStores = async (req, res) => {
  try {
    const stores   = await Store.find().populate("owner", "username").lean();
    const enriched = await Promise.all(stores.map(async (store) => {
      const [userCount, productCount, salesAgg] = await Promise.all([User.countDocuments({ storeId: store._id }), Product.countDocuments({ storeId: store._id }), Sale.aggregate([{ $match: { storeId: store._id } }, { $group: { _id: null, total: { $sum: "$total" } } }])]);
      return { Name: store.name, Owner: store.owner?.username, Plan: store.plan, Status: store.active ? "Active" : "Inactive", Expires: store.planExpiresAt ? new Date(store.planExpiresAt).toLocaleDateString() : "—", Users: userCount, Products: productCount, Revenue: (salesAgg[0]?.total || 0).toFixed(2), MonthlyPrice: store.monthlyPrice || "—", CreatedAt: new Date(store.createdAt).toLocaleDateString() };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   PLATFORM AUDIT LOG
───────────────────────────────────────────── */
export const getPlatformAuditLog = async (req, res) => {
  try {
    const { limit = 50, storeId } = req.query;
    const query = storeId ? { storeId } : {};
    const logs  = await AuditLog.find(query).sort({ createdAt: -1 }).limit(Number(limit)).populate("storeId", "name").lean();
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   STORE NOTES
───────────────────────────────────────────── */
export const updateStoreNotes = async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, { internalNotes: req.body.notes }, { new: true });
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ message: "Notes saved" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   WELCOME MESSAGE
───────────────────────────────────────────── */
export const setWelcomeMessage = async (req, res) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, { welcomeMessage: req.body.welcomeMessage }, { new: true });
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ message: "Welcome message updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   ACTIVITY FEED
───────────────────────────────────────────── */
export const getActivityFeed = async (req, res) => {
  try {
    const [recentSales, recentUsers, recentStores] = await Promise.all([
      Sale.find().sort({ createdAt: -1 }).limit(15).populate("storeId", "name").select("total storeId createdAt").lean(),
      User.find({ role: { $ne: "superadmin" } }).sort({ createdAt: -1 }).limit(10).populate("storeId", "name").select("username role storeId createdAt").lean(),
      Store.find().sort({ createdAt: -1 }).limit(5).select("name plan createdAt").lean(),
    ]);
    const feed = [
      ...recentSales.map(s  => ({ type: "sale",  store: s.storeId?.name, amount: s.total, time: s.createdAt })),
      ...recentUsers.map(u  => ({ type: "user",  store: u.storeId?.name, username: u.username, role: u.role, time: u.createdAt })),
      ...recentStores.map(s => ({ type: "store", name: s.name, plan: s.plan, time: s.createdAt })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 30);
    res.json(feed);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   UPDATE SUPERADMIN PROFILE
───────────────────────────────────────────── */
export const getSuperAdminProfile = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select("username maxDevices devices createdAt platformTelegramBotToken platformAdminChatId");
    if (!admin) return res.status(404).json({ message: "User not found" });
    res.json({
      username:                 admin.username,
      maxDevices:               admin.maxDevices || 1,
      activeDevices:            admin.devices?.length || 0,
      devices:                  admin.devices || [],
      createdAt:                admin.createdAt,
      platformTelegramBotToken: admin.platformTelegramBotToken || "",
      platformAdminChatId:      admin.platformAdminChatId || "",
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateSuperAdminProfile = async (req, res) => {
  try {
    const { username, newPassword, maxDevices, platformTelegramBotToken, platformAdminChatId } = req.body;
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: "User not found" });
    if (username && username !== admin.username) {
      const exists = await User.findOne({ username });
      if (exists) return res.status(400).json({ message: "Username already taken" });
      admin.username = username;
    }
    if (newPassword) admin.password = newPassword;
    if (maxDevices !== undefined) admin.maxDevices = Math.min(Math.max(parseInt(maxDevices) || 1, 1), 10);
    if (platformTelegramBotToken !== undefined) admin.platformTelegramBotToken = platformTelegramBotToken;
    if (platformAdminChatId      !== undefined) admin.platformAdminChatId      = platformAdminChatId;
    await admin.save();
    res.json({ message: "Profile updated", username: admin.username, maxDevices: admin.maxDevices });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getSuperAdminTelegramChatId = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id).select("platformTelegramBotToken");
    if (!admin?.platformTelegramBotToken) return res.status(400).json({ message: "Bot token not set yet" });
    const { getRecentChatId } = await import("../services/telegram.service.js");
    const result = await getRecentChatId(admin.platformTelegramBotToken);
    if (!result) return res.status(404).json({ message: "No messages received yet. Send any message to the bot first." });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   KICK ONE DEVICE FROM SUPERADMIN OWN SESSION
───────────────────────────────────────────── */
export const kickSuperAdminDevice = async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ message: "deviceId required" });
    const admin = await User.findById(req.user._id);
    if (!admin) return res.status(404).json({ message: "User not found" });
    admin.devices = admin.devices.filter(d => d.deviceId !== deviceId);
    if (admin.deviceId === deviceId) {
      admin.deviceId     = admin.devices[0]?.deviceId     || null;
      admin.sessionToken = admin.devices[0]?.sessionToken || null;
    }
    await admin.save();
    res.json({ message: "Device kicked" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CREATE SUPER ADMIN (one-time setup)
───────────────────────────────────────────── */
export const createSuperAdmin = async (req, res) => {
  try {
    const exists = await User.findOne({ role: "superadmin" });
    if (exists) return res.status(403).json({ message: "Super admin already exists" });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "username and password required" });
    const superAdmin = await User.create({ username, password, role: "superadmin" });
    res.status(201).json({ message: "Super admin created", id: superAdmin._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   CAFÉ STAFF MANAGEMENT (superadmin only)
───────────────────────────────────────────── */
export const getCafeStaff = async (req, res) => {
  try {
    const staff = await CafeStaff.find({ storeId: req.params.id }).select("-password").sort({ createdAt: -1 });
    res.json(staff);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const createCafeStaffByAdmin = async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    if (!name || !username || !password)
      return res.status(400).json({ message: "Name, username and password required" });

    const exists = await CafeStaff.findOne({ username: username.trim().toLowerCase() });
    if (exists) return res.status(409).json({ message: "Username already taken" });

    const staff = await CafeStaff.create({
      storeId: req.params.id,
      name, username: username.trim().toLowerCase(),
      password, role: role || "staff",
    });
    const { password: _, ...rest } = staff.toObject();
    res.status(201).json(rest);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateCafeStaffByAdmin = async (req, res) => {
  try {
    const staff = await CafeStaff.findOne({ _id: req.params.staffId, storeId: req.params.id });
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    const { name, role, isActive, password } = req.body;
    if (name !== undefined)     staff.name     = name;
    if (role !== undefined)     staff.role     = role;
    if (isActive !== undefined) staff.isActive = isActive;
    if (password)               staff.password = password;
    await staff.save();
    const { password: _, ...rest } = staff.toObject();
    res.json(rest);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteCafeStaffByAdmin = async (req, res) => {
  try {
    await CafeStaff.findOneAndDelete({ _id: req.params.staffId, storeId: req.params.id });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

/* ─────────────────────────────────────────────
   COPY PRODUCTS & CATEGORIES TO ANOTHER STORE
   POST /api/superadmin/stores/:id/copy-products
   Body: { targetStoreId }
───────────────────────────────────────────── */
export const copyProductsToStore = async (req, res) => {
  try {
    const { targetStoreId } = req.body;
    if (!targetStoreId) return res.status(400).json({ message: "targetStoreId is required" });

    const [srcStore, tgtStore] = await Promise.all([
      Store.findById(req.params.id),
      Store.findById(targetStoreId),
    ]);
    if (!srcStore) return res.status(404).json({ message: "Source store not found" });
    if (!tgtStore) return res.status(404).json({ message: "Target store not found" });
    if (String(srcStore._id) === String(tgtStore._id))
      return res.status(400).json({ message: "Source and target stores must be different" });

    // ── 1. Copy categories, reuse existing by name ──────────────
    const srcCats = await Category.find({ storeId: srcStore._id }).lean();
    const tgtCats = await Category.find({ storeId: tgtStore._id }).lean();
    const tgtCatMap = new Map(tgtCats.map(c => [c.name.toLowerCase(), c._id]));

    const catIdMap = new Map(); // srcCatId → tgtCatId
    let categoriesCopied = 0;

    for (const cat of srcCats) {
      const key = cat.name.toLowerCase();
      if (tgtCatMap.has(key)) {
        catIdMap.set(String(cat._id), tgtCatMap.get(key));
      } else {
        const newCat = await Category.create({ name: cat.name, storeId: tgtStore._id });
        catIdMap.set(String(cat._id), newCat._id);
        tgtCatMap.set(key, newCat._id);
        categoriesCopied++;
      }
    }

    // ── 2. Copy products, skip duplicates by barcode ────────────
    const srcProducts = await Product.find({ storeId: srcStore._id }).lean();
    const existingBarcodes = new Set(
      (await Product.find({ storeId: tgtStore._id }).select("barcode").lean()).map(p => p.barcode)
    );

    let productsCopied = 0;
    let skipped = 0;
    const toInsert = [];

    for (const p of srcProducts) {
      if (existingBarcodes.has(p.barcode)) { skipped++; continue; }
      const { _id, storeId, createdAt, updatedAt, __v, ...fields } = p;
      toInsert.push({
        ...fields,
        storeId: tgtStore._id,
        category: p.category ? (catIdMap.get(String(p.category)) ?? null) : null,
      });
      existingBarcodes.add(p.barcode); // prevent duplicates within the batch
      productsCopied++;
    }

    if (toInsert.length) await Product.insertMany(toInsert, { ordered: false });

    res.json({
      message: `Copied ${productsCopied} products and ${categoriesCopied} categories to "${tgtStore.name}"`,
      productsCopied,
      categoriesCopied,
      skipped,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};