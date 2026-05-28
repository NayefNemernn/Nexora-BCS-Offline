import express from "express";
import { protectCafe, isCafeManager } from "../middleware/cafeAuth.middleware.js";
import { cafeStaffLogin, getCafeStaffMe } from "../controllers/cafeAuth.controller.js";
import {
  getTables, createTable, updateTable, deleteTable, updateTableStatus,
  getCafeMenuItems, createCafeMenuItem, updateCafeMenuItem, deleteCafeMenuItem,
  getOrders, getOrder, openOrder, addItems, updateItem, cancelItem,
  sendToKitchen, updateOrderMeta, checkoutOrder, transferItems, mergeOrders, cancelOrder,
  getKitchenOrders, updateItemStatus,
  getReservations, createReservation, updateReservation, seatReservation, cancelReservation,
} from "../controllers/cafe.controller.js";
import {
  getSalesReport, getPeakHours, getItemsReport, getTablesReport,
  getKitchenReport, getReservationsReport, getCustomersReport, getGamesReport,
} from "../controllers/cafeReports.controller.js";
import {
  listCustomers, adjustPoints,
} from "../controllers/cafeCustomer.controller.js";
import CafeReward         from "../models/CafeReward.js";
import CafeTriviaQuestion from "../models/CafeTriviaQuestion.js";
import Store              from "../models/Store.js";

const router = express.Router();

/* ── Public auth routes (no token needed) ── */
router.post("/auth/login", cafeStaffLogin);

/* ── All routes below require valid token (café staff or main-POS user) ── */
router.use(protectCafe);

router.get("/auth/me", getCafeStaffMe);

// Menu items
router.get("/menu",              getCafeMenuItems);
router.post("/menu",             isCafeManager, createCafeMenuItem);
router.put("/menu/:id",          isCafeManager, updateCafeMenuItem);
router.delete("/menu/:id",       isCafeManager, deleteCafeMenuItem);

// Tables
router.get("/tables",              getTables);
router.post("/tables",             isCafeManager, createTable);
router.put("/tables/:id",          isCafeManager, updateTable);
router.delete("/tables/:id",       isCafeManager, deleteTable);
router.put("/tables/:id/status",   updateTableStatus);

// Orders
router.get("/orders",              getOrders);
router.get("/orders/:id",          getOrder);
router.post("/orders",             openOrder);
router.post("/orders/:id/items",   addItems);
router.put("/orders/:id/items/:itemId",    updateItem);
router.delete("/orders/:id/items/:itemId", cancelItem);
router.post("/orders/:id/send-to-kitchen", sendToKitchen);
router.put("/orders/:id/meta",     updateOrderMeta);
router.post("/orders/:id/checkout", checkoutOrder);
router.post("/orders/transfer",    transferItems);
router.post("/orders/merge",       mergeOrders);
router.delete("/orders/:id",       isCafeManager, cancelOrder);

// Kitchen
router.get("/kitchen",             getKitchenOrders);
router.put("/kitchen/:orderId/items/:itemId/status", updateItemStatus);

// Reservations
router.get("/reservations",        getReservations);
router.post("/reservations",       createReservation);
router.put("/reservations/:id",    updateReservation);
router.post("/reservations/:id/seat", seatReservation);
router.delete("/reservations/:id", cancelReservation);

// ── Reports (all periods: daily/weekly/monthly/yearly) ──
router.get("/reports/sales",         isCafeManager, getSalesReport);
router.get("/reports/peak-hours",    isCafeManager, getPeakHours);
router.get("/reports/items",         isCafeManager, getItemsReport);
router.get("/reports/tables",        isCafeManager, getTablesReport);
router.get("/reports/kitchen",       isCafeManager, getKitchenReport);
router.get("/reports/reservations",  isCafeManager, getReservationsReport);
router.get("/reports/customers",     isCafeManager, getCustomersReport);
router.get("/reports/games",         isCafeManager, getGamesReport);

// ── Loyalty: Rewards (manager) ──
router.get("/rewards", async (req, res) => {
  const rewards = await CafeReward.find({ storeId: req.storeId }).sort({ pointsCost: 1 });
  res.json({ rewards });
});
router.post("/rewards", isCafeManager, async (req, res) => {
  const reward = await CafeReward.create({ storeId: req.storeId, ...req.body });
  res.status(201).json({ reward });
});
router.put("/rewards/:id", isCafeManager, async (req, res) => {
  const reward = await CafeReward.findOneAndUpdate(
    { _id: req.params.id, storeId: req.storeId },
    req.body, { new: true }
  );
  res.json({ reward });
});
router.delete("/rewards/:id", isCafeManager, async (req, res) => {
  await CafeReward.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
  res.json({ message: "Deleted" });
});

// ── Loyalty: Trivia Questions (manager) ──
router.get("/trivia", async (req, res) => {
  const questions = await CafeTriviaQuestion.find({ storeId: req.storeId });
  res.json({ questions });
});
router.post("/trivia", isCafeManager, async (req, res) => {
  const q = await CafeTriviaQuestion.create({ storeId: req.storeId, ...req.body });
  res.status(201).json({ question: q });
});
router.put("/trivia/:id", isCafeManager, async (req, res) => {
  const q = await CafeTriviaQuestion.findOneAndUpdate(
    { _id: req.params.id, storeId: req.storeId }, req.body, { new: true }
  );
  res.json({ question: q });
});
router.delete("/trivia/:id", isCafeManager, async (req, res) => {
  await CafeTriviaQuestion.findOneAndDelete({ _id: req.params.id, storeId: req.storeId });
  res.json({ message: "Deleted" });
});

// ── Loyalty: Customers (manager) ──
router.get("/customers",               isCafeManager, listCustomers);
router.put("/customers/:id/points",    isCafeManager, adjustPoints);

// ── Loyalty: Points config ──
router.put("/loyalty/config", isCafeManager, async (req, res) => {
  const { cafePointsPerItem } = req.body;
  const store = await Store.findByIdAndUpdate(
    req.storeId, { cafePointsPerItem }, { new: true }
  );
  res.json({ cafePointsPerItem: store.cafePointsPerItem });
});

export default router;
