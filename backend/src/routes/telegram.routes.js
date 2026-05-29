import express from "express";
import { handleTelegramWebhook } from "../controllers/telegram.webhook.js";
import { triggerReport }         from "../controllers/telegram.report.js";
import { protect, isAdmin }      from "../middleware/auth.middleware.js";

const router = express.Router();

// Public — called directly by Telegram servers
router.post("/webhook", handleTelegramWebhook);

// Protected — triggered by the admin from the app
router.post("/report", protect, isAdmin, triggerReport);

export default router;
