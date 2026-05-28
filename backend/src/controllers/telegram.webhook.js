import OnlineOrder from "../models/OnlineOrder.js";
import Store       from "../models/Store.js";
import { getIO }   from "../socket/index.js";
import {
  answerCallback, editMessage, sendMessage,
  buildDriverConfirmMessage,
} from "../services/telegram.service.js";

export const handleTelegramWebhook = async (req, res) => {
  // Always respond 200 immediately so Telegram doesn't retry
  res.sendStatus(200);

  try {
    const update = req.body;
    if (!update.callback_query) return;

    const cb     = update.callback_query;
    const data   = cb.data || "";
    const chatId = String(cb.from.id);
    const driverName = cb.from.first_name || cb.from.username || chatId;

    // ── Accept order ───────────────────────────────────────────
    if (data.startsWith("accept_")) {
      const orderId = data.replace("accept_", "");
      const order = await OnlineOrder.findById(orderId).populate("storeId", "telegramBotToken");
      if (!order) return;

      const token = order.storeId?.telegramBotToken;

      // Already assigned to someone else
      if (order.assignedDriver?.chatId && order.assignedDriver.chatId !== chatId) {
        await answerCallback(token, cb.id, `❌ Already accepted by ${order.assignedDriver.name}`, true);
        return;
      }

      // Already assigned to this driver
      if (order.assignedDriver?.chatId === chatId) {
        await answerCallback(token, cb.id, "You already accepted this order!", false);
        return;
      }

      // Assign to this driver
      order.assignedDriver = { name: driverName, chatId };
      await order.save();

      await answerCallback(token, cb.id, `✅ Order ${order.orderNumber} is yours!`, false);

      // Edit all drivers' messages → show who took it
      const takenText = `✅ <b>${order.orderNumber}</b> accepted by <b>${driverName}</b>`;
      for (const { chatId: dChatId, messageId } of order.driverMessageIds || []) {
        if (dChatId === chatId) continue; // accepting driver gets new message below
        await editMessage(token, dChatId, messageId, takenText, { inline_keyboard: [] });
      }

      // Send confirmation to the accepting driver
      const STORE_FRONTEND_URL = process.env.STORE_FRONTEND_URL || "http://localhost:5174";
      const deliveryPageUrl = `${STORE_FRONTEND_URL}/delivery/${order._id}`;
      const { text, replyMarkup } = buildDriverConfirmMessage(order, deliveryPageUrl);
      await sendMessage(token, chatId, text, replyMarkup);

      // Notify admin via socket
      const io = getIO();
      if (io) {
        io.to(`store_${order.storeId._id}_admin`).emit("order_status_changed", {
          orderId: order._id, orderNumber: order.orderNumber,
          status: order.status, driverName,
        });
      }
    }

    // ── Money collected ────────────────────────────────────────
    if (data.startsWith("collected_")) {
      const orderId = data.replace("collected_", "");
      const order = await OnlineOrder.findById(orderId).populate("storeId", "telegramBotToken");
      if (!order) return;

      const token = order.storeId?.telegramBotToken;

      if (order.assignedDriver?.chatId !== chatId) {
        await answerCallback(token, cb.id, "This is not your order.", true);
        return;
      }
      if (order.status === "pending_payment" || order.status === "completed") {
        await answerCallback(token, cb.id, "Already confirmed!", false);
        return;
      }

      order.status = "pending_payment";
      await order.save();

      await answerCallback(token, cb.id, "💵 Cash confirmed! Give it to the manager.", false);
      await sendMessage(token, chatId,
        `💵 <b>Cash collected for ${order.orderNumber}</b>\n\nHand $${order.total.toFixed(2)} to the manager. Well done! 👏`
      );

      // Notify admin via socket
      const io = getIO();
      if (io) {
        io.to(`store_${order.storeId._id}_admin`).emit("order_status_changed", {
          orderId: order._id, orderNumber: order.orderNumber, status: "pending_payment",
        });
      }
    }
  } catch (err) {
    console.error("[TelegramWebhook]", err.message);
  }
};
