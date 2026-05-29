import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import {
  getMyStore, updateStore, addCashier, updateCashier, removeCashier,
} from "../controllers/store.controller.js";
import Store from "../models/Store.js";

const router = express.Router();
router.use(protect);

router.get("/",              isAdmin, getMyStore);
router.put("/",              isAdmin, updateStore);
router.post("/users",        isAdmin, addCashier);
router.put("/users/:id",     isAdmin, updateCashier);
router.delete("/users/:id",  isAdmin, removeCashier);

// Update online store settings
router.patch("/online-settings", isAdmin, async (req, res) => {
  try {
    const {
      isOnlineStoreActive, deliveryFee, minimumOrder, deliveryTimeMin, deliveryTimeMax,
      pointsEnabled, pointsPerUnit, telegramBotToken, deliveryDrivers,
      deliveryPhone, adminTelegramChatId,
    } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.storeId,
      { $set: {
        isOnlineStoreActive, deliveryFee, minimumOrder, deliveryTimeMin, deliveryTimeMax,
        pointsEnabled, pointsPerUnit, telegramBotToken, deliveryDrivers,
        deliveryPhone, adminTelegramChatId,
      }},
      { new: true }
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ store });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get recent chat ID from bot updates
router.get("/telegram-last-chat", isAdmin, async (req, res) => {
  try {
    const store = await Store.findById(req.storeId).select("telegramBotToken");
    if (!store?.telegramBotToken) return res.status(400).json({ message: "Bot token not set yet" });
    const { getRecentChatId } = await import("../services/telegram.service.js");
    const result = await getRecentChatId(store.telegramBotToken);
    if (!result) return res.status(404).json({ message: "No messages received yet. Have the driver send any message to the bot first." });
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Set Telegram webhook (called once after deploying to production)
router.post("/telegram-set-webhook", isAdmin, async (req, res) => {
  try {
    const store = await Store.findById(req.storeId).select("telegramBotToken");
    const token = store?.telegramBotToken?.trim();
    if (!token) return res.status(400).json({ message: "Bot token not saved yet" });
    const { backendUrl } = req.body;
    if (!backendUrl) return res.status(400).json({ message: "backendUrl is required" });
    const webhookUrl = `${backendUrl.replace(/\/$/, "")}/api/telegram/webhook`;
    const { setWebhook } = await import("../services/telegram.service.js");
    const result = await setWebhook(token, webhookUrl);
    if (!result.ok) return res.status(400).json({ message: result.description });
    res.json({ message: `Webhook set to ${webhookUrl}`, result });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Send test message to all drivers
router.post("/telegram-test", isAdmin, async (req, res) => {
  try {
    const store = await Store.findById(req.storeId).select("telegramBotToken deliveryDrivers");
    const token   = store?.telegramBotToken?.trim();
    const drivers = (store?.deliveryDrivers || []).filter(d => d.chatId?.trim());
    if (!token)           return res.status(400).json({ message: "Bot token not saved yet" });
    if (!drivers.length)  return res.status(400).json({ message: "No drivers saved yet" });

    const { sendMessage } = await import("../services/telegram.service.js");
    const results = [];
    for (const driver of drivers) {
      const r = await sendMessage(token, driver.chatId.trim(),
        `✅ <b>Test — Market POS</b>\n\nHello <b>${driver.name}</b>! Telegram notifications are working.`);
      results.push({ driver: driver.name, ok: r?.ok, error: r?.description });
    }
    const allOk = results.every(r => r.ok);
    if (!allOk) return res.status(400).json({ message: "Some messages failed", results });
    res.json({ message: `Test sent to ${drivers.length} driver(s)`, results });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Mark all notifications as read
router.post("/notifications/read", async (req, res) => {
  try {
    const store = await Store.findById(req.storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    store.notifications = (store.notifications || []).map(n => ({ ...n, read: true }));
    store.markModified("notifications");
    await store.save();
    res.json({ message: "Notifications marked as read" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;