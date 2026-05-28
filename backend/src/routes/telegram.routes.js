import express from "express";
import { handleTelegramWebhook } from "../controllers/telegram.webhook.js";

const router = express.Router();

// Public — called directly by Telegram
router.post("/webhook", handleTelegramWebhook);

export default router;
