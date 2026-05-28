import OnlineOrder from "../models/OnlineOrder.js";
import Store       from "../models/Store.js";
import Product     from "../models/Product.js";
import Sale        from "../models/Sale.js";
import StockLog    from "../models/StockLog.js";
import AuditLog    from "../models/AuditLog.js";
import PromoCode   from "../models/PromoCode.js";
import PointsOffer from "../models/PointsOffer.js";
import Customer    from "../models/Customer.js";
import jwt         from "jsonwebtoken";
import { getIO }   from "../socket/index.js";
import { sendMessage, editMessage, buildDispatchMessage, buildDriverConfirmMessage } from "../services/telegram.service.js";

/* ── POST /api/orders  (public — no auth) ───────────────────── */
export const submitOrder = async (req, res) => {
  try {
    const { slug, customer, items, notes, promoCode: promoInput, redeemedOfferId, tipAmount: tipInput, scheduledFor } = req.body;

    if (!slug)                    return res.status(400).json({ message: "Store slug is required" });
    if (!customer?.name)          return res.status(400).json({ message: "Customer name is required" });
    if (!customer?.phone)         return res.status(400).json({ message: "Customer phone is required" });
    if (!items || items.length === 0) return res.status(400).json({ message: "Cart is empty" });

    const store = await Store.findOne({ slug, active: true });
    if (!store)                    return res.status(404).json({ message: "Store not found" });
    if (!store.isOnlineStoreActive) return res.status(403).json({ message: "Online store is not accepting orders" });

    // Optional: identify logged-in customer via JWT
    let customerId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        if (decoded.role === "customer" && decoded.storeId === store._id.toString()) {
          customerId = decoded.customerId;
        }
      } catch {}
    }

    // Validate & price items from DB
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, storeId: store._id, active: true, isAvailableOnline: true });
      if (!product) return res.status(404).json({ message: `Product not found: ${item.productId}` });
      if (product.stock < item.quantity) return res.status(400).json({ message: `${product.name} — only ${product.stock} in stock` });

      const sub = +(product.price * item.quantity).toFixed(2);
      subtotal += sub;
      orderItems.push({ productId: product._id, name: product.name, price: product.price, quantity: item.quantity, subtotal: sub });
    }

    if (store.minimumOrder > 0 && subtotal < store.minimumOrder)
      return res.status(400).json({ message: `Minimum order is ${store.currencySymbol}${store.minimumOrder}` });

    const deliveryFee = store.deliveryFee || 0;
    const tipAmount   = Math.max(0, Number(tipInput) || 0);

    // ── Promo code ─────────────────────────────────────────────
    let discount       = 0;
    let promoData      = null;
    let redeemedOfferData = null;
    let pointsRedeemed = 0;

    if (promoInput?.trim() && !redeemedOfferId) {
      const promo = await PromoCode.findOne({
        storeId:  store._id,
        code:     promoInput.trim().toUpperCase(),
        isActive: true,
      });

      if (!promo) return res.status(400).json({ message: "Invalid promo code" });
      if (promo.expiresAt && new Date() > promo.expiresAt)
        return res.status(400).json({ message: "Promo code has expired" });
      if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit)
        return res.status(400).json({ message: "Promo code usage limit reached" });
      if (promo.minOrder > 0 && subtotal < promo.minOrder)
        return res.status(400).json({ message: `Minimum order of ${store.currencySymbol}${promo.minOrder} required` });

      discount = promo.type === "percent"
        ? +((subtotal * promo.value) / 100).toFixed(2)
        : Math.min(promo.value, subtotal);

      promoData = {
        code:           promo.code,
        discountType:   promo.type,
        discountValue:  promo.value,
        discountAmount: discount,
      };

      await PromoCode.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });
    }

    // ── Points offer redemption ────────────────────────────────
    if (redeemedOfferId && !promoInput?.trim()) {
      if (!customerId) return res.status(401).json({ message: "Login required to redeem points" });

      const offer = await PointsOffer.findOne({ _id: redeemedOfferId, storeId: store._id, isActive: true });
      if (!offer) return res.status(404).json({ message: "Offer not found" });
      if (offer.validUntil && new Date() > offer.validUntil)
        return res.status(400).json({ message: "This offer has expired" });

      const cust = await Customer.findById(customerId);
      if (!cust) return res.status(404).json({ message: "Customer not found" });
      if (cust.loyaltyPoints < offer.pointsCost)
        return res.status(400).json({ message: `Not enough points (need ${offer.pointsCost}, have ${cust.loyaltyPoints})` });

      if (offer.offerType === "free_delivery") {
        discount = deliveryFee;
      } else if (offer.offerType === "discount_percent") {
        discount = +((subtotal * offer.offerValue) / 100).toFixed(2);
      } else {
        discount = Math.min(offer.offerValue, subtotal);
      }

      pointsRedeemed = offer.pointsCost;
      redeemedOfferData = {
        offerId:        offer._id,
        offerName:      offer.name,
        pointsCost:     offer.pointsCost,
        discountAmount: discount,
      };

      // Deduct points immediately
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          loyaltyPoints:       -offer.pointsCost,
          totalPointsRedeemed: offer.pointsCost,
        },
      });
      await PointsOffer.findByIdAndUpdate(offer._id, { $inc: { usedCount: 1 } });
    }

    // ── Calculate total ────────────────────────────────────────
    const total = +(subtotal + deliveryFee - discount + tipAmount).toFixed(2);

    // Points customer will earn when order completes
    const pointsEarned = (store.pointsEnabled && customerId)
      ? Math.floor(subtotal * (store.pointsPerUnit || 1))
      : 0;

    const order = await OnlineOrder.create({
      storeId:    store._id,
      customerId: customerId || null,
      customer: {
        name:                customer.name,
        phone:               customer.phone,
        address:             customer.address || "",
        locationDescription: customer.locationDescription || "",
        lat:                 customer.lat  ?? null,
        lng:                 customer.lng  ?? null,
        notes:               customer.notes || notes || "",
      },
      items:       orderItems,
      subtotal,
      deliveryFee,
      discount,
      tipAmount,
      total,
      promoCode:      promoData      || undefined,
      redeemedOffer:  redeemedOfferData || undefined,
      pointsEarned,
      pointsRedeemed,
      scheduledFor:   scheduledFor   || null,
    });

    // Notify admin + cashiers via socket
    const io = getIO();
    if (io) {
      const orderPayload = {
        _id:          order._id,
        orderNumber:  order.orderNumber,
        customer:     order.customer,
        total:        order.total,
        itemCount:    order.items.length,
        scheduledFor: order.scheduledFor,
        createdAt:    order.createdAt,
      };
      io.to(`store_${store._id}_admin`).emit("new_order", orderPayload);
      io.to(`store_${store._id}_cashier`).emit("new_order", orderPayload);
    }

    res.status(201).json({ orderId: order._id, orderNumber: order.orderNumber, total: order.total, pointsEarned });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/orders  (admin) ───────────────────────────────── */
export const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { storeId: req.storeId };
    if (status) filter.status = status;

    const orders = await OnlineOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await OnlineOrder.countDocuments(filter);
    res.json({ orders, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/orders/:id  (admin) ───────────────────────────── */
export const getOrderById = async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/orders/track/:id  (public — no auth) ─────────── */
export const trackOrder = async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id).select(
      "orderNumber status customer.name total discount tipAmount promoCode redeemedOffer pointsEarned scheduledFor createdAt updatedAt"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/orders/:id/accept  (admin) ─────────────────── */
export const acceptOrder = async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order)               return res.status(404).json({ message: "Order not found" });
    if (order.status !== "pending") return res.status(400).json({ message: "Order is not pending" });

    order.status = "accepted";
    await order.save();

    const io = getIO();
    if (io) {
      // Push to cashier screen for cart auto-injection
      io.to(`store_${req.storeId}_cashier`).emit("order_accepted", {
        _id:             order._id,
        orderNumber:     order.orderNumber,
        customer:        order.customer,
        items:           order.items,
        total:           order.total,
        deliveryFee:     order.deliveryFee,
      });
      // Confirm to admin room
      io.to(`store_${req.storeId}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "accepted",
      });
    }

    await AuditLog.create({
      storeId: req.storeId, userId: req.user._id, username: req.user.username,
      action: "order_accepted", description: `Accepted order ${order.orderNumber}`,
    });

    res.json({ message: "Order accepted", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/orders/:id/reject  (admin) ─────────────────── */
export const rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await OnlineOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order)                      return res.status(404).json({ message: "Order not found" });
    if (!["pending", "accepted"].includes(order.status))
      return res.status(400).json({ message: "Cannot reject this order" });

    order.status          = "rejected";
    order.rejectionReason = reason || "";
    await order.save();

    await refundPoints(order);

    const io = getIO();
    if (io) {
      io.to(`store_${req.storeId}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "rejected",
      });
    }

    res.json({ message: "Order rejected", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/orders/:id/cancel  (admin) ─────────────────── */
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await OnlineOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (["completed", "cancelled"].includes(order.status))
      return res.status(400).json({ message: "Order is already finished" });

    order.status          = "cancelled";
    order.rejectionReason = reason || "";
    await order.save();

    await refundPoints(order);

    const io = getIO();
    if (io) {
      io.to(`store_${req.storeId}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "cancelled",
      });
      io.to(`store_${req.storeId}_cashier`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "cancelled",
      });
    }

    await AuditLog.create({
      storeId: req.storeId, userId: req.user._id, username: req.user.username,
      action: "order_cancelled",
      description: `Order ${order.orderNumber} cancelled${reason ? ` — ${reason}` : ""}`,
    });

    res.json({ message: "Order cancelled", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/orders/:id/out-for-delivery  (admin/cashier) ── */
export const markOutForDelivery = async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!["accepted", "out_for_delivery"].includes(order.status))
      return res.status(400).json({ message: "Order must be accepted first" });

    // Only update status if not already out_for_delivery (checkout may have set it)
    if (order.status !== "out_for_delivery") {
      order.status = "out_for_delivery";
      await order.save();
    }

    const io = getIO();
    if (io) {
      io.to(`store_${req.storeId}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "out_for_delivery",
      });
    }

    // Send Telegram notification to ALL drivers
    const STORE_FRONTEND_URL = process.env.STORE_FRONTEND_URL || "http://localhost:5174";
    let telegramError = null;
    try {
      const store = await Store.findById(req.storeId).select("telegramBotToken deliveryDrivers");
      const token   = store?.telegramBotToken?.trim();
      const drivers = (store?.deliveryDrivers || []).filter(d => d.chatId?.trim());

      if (!token) {
        telegramError = "Telegram not configured (missing bot token)";
      } else if (drivers.length === 0) {
        telegramError = "No drivers configured";
      } else {
        const messageIds = [];
        let lastTgError = "";
        for (const driver of drivers) {
          // Each driver gets a unique accept URL containing their chatId
          const acceptUrl = `${STORE_FRONTEND_URL}/driver/accept/${order._id}?cid=${driver.chatId.trim()}&name=${encodeURIComponent(driver.name || "Driver")}`;
          const { text, replyMarkup } = buildDispatchMessage(order, acceptUrl);
          const result = await sendMessage(token, driver.chatId.trim(), text, replyMarkup);
          if (result?.ok && result.result?.message_id) {
            messageIds.push({ chatId: driver.chatId.trim(), messageId: result.result.message_id });
          } else {
            lastTgError = result?.description || "Unknown Telegram error";
            console.error(`[Telegram] send failed for driver ${driver.name}:`, lastTgError);
          }
        }
        // Save message IDs so we can edit them when a driver accepts
        await OnlineOrder.findByIdAndUpdate(order._id, { driverMessageIds: messageIds });
        if (messageIds.length === 0) telegramError = `Failed to send to any driver: ${lastTgError}`;
      }
    } catch (tgErr) {
      telegramError = tgErr.message;
    }

    res.json({
      message: "Marked as out for delivery",
      order,
      telegramSent: !telegramError,
      telegramError,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── helper: award loyalty points when an order completes ────── */
const awardPoints = async (order, storeId) => {
  if (!order.customerId || order.pointsEarned <= 0) return;
  try {
    const store = await Store.findById(storeId).select("pointsEnabled");
    if (!store?.pointsEnabled) return;
    await Customer.findByIdAndUpdate(order.customerId, {
      $inc: { loyaltyPoints: order.pointsEarned, totalPointsEarned: order.pointsEarned },
    });
  } catch {}
};

/* ── helper: refund redeemed points when an order is cancelled ─ */
const refundPoints = async (order) => {
  if (!order.customerId || order.pointsRedeemed <= 0) return;
  try {
    await Customer.findByIdAndUpdate(order.customerId, {
      $inc: {
        loyaltyPoints:       order.pointsRedeemed,
        totalPointsRedeemed: -order.pointsRedeemed,
      },
    });
  } catch {}
};

/* ── PATCH /api/orders/:id/payment-received  (admin) ────────── */
export const confirmPayment = async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({ _id: req.params.id, storeId: req.storeId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!["out_for_delivery", "pending_payment"].includes(order.status))
      return res.status(400).json({ message: "Order is not awaiting payment" });

    // Update the linked Sale (created by cashier at checkout)
    if (order.saleId) {
      await Sale.findByIdAndUpdate(order.saleId, { status: "completed", paid: true });
    }

    order.status        = "completed";
    order.paymentStatus = "paid";
    await order.save();

    await awardPoints(order, req.storeId);

    const io = getIO();
    if (io) {
      io.to(`store_${req.storeId}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "completed",
      });
      io.to(`store_${req.storeId}_cashier`).emit("order_completed", {
        orderId: order._id, orderNumber: order.orderNumber,
      });
    }

    await AuditLog.create({
      storeId: req.storeId, userId: req.user._id, username: req.user.username,
      action: "order_payment_confirmed",
      description: `Payment confirmed for order ${order.orderNumber} — $${order.total}`,
    });

    res.json({ message: "Payment confirmed, order completed", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/orders/delivery/:id  (public — delivery man link) ─ */
export const getDeliveryOrder = async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id).select(
      "orderNumber status customer items subtotal deliveryFee total createdAt"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/orders/:id/cash-collected  (public — delivery man) ─ */
export const cashCollected = async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "out_for_delivery")
      return res.status(400).json({ message: "Order is not out for delivery" });

    if (order.saleId) {
      await Sale.findByIdAndUpdate(order.saleId, { status: "completed", paid: true });
    }

    order.status        = "completed";
    order.paymentStatus = "paid";
    await order.save();

    await awardPoints(order, order.storeId);

    const io = getIO();
    if (io) {
      io.to(`store_${order.storeId}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber, status: "completed",
      });
      io.to(`store_${order.storeId}_cashier`).emit("order_completed", {
        orderId: order._id, orderNumber: order.orderNumber,
      });
    }

    res.json({ message: "Cash collected, order completed", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── PATCH /api/orders/:id/driver-accept  (public — driver URL button) ─ */
export const driverAcceptOrder = async (req, res) => {
  try {
    const { chatId, driverName } = req.body;
    if (!chatId) return res.status(400).json({ message: "chatId is required" });

    const order = await OnlineOrder.findById(req.params.id)
      .populate("storeId", "telegramBotToken");
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "out_for_delivery")
      return res.status(400).json({ message: "Order is not awaiting a driver" });

    const token = order.storeId?.telegramBotToken?.trim();

    // Already claimed by someone else
    if (order.assignedDriver?.chatId && order.assignedDriver.chatId !== chatId) {
      return res.status(409).json({ message: `Already accepted by ${order.assignedDriver.name}` });
    }

    // This driver already accepted (idempotent)
    if (order.assignedDriver?.chatId === chatId) {
      return res.json({ message: "You already accepted this order", order });
    }

    // Assign driver
    const name = driverName || "Driver";
    order.assignedDriver = { name, chatId };
    await order.save();

    // Edit all other drivers' messages → show who claimed it
    if (token) {
      const takenText = `✅ <b>${order.orderNumber}</b> accepted by <b>${name}</b>`;
      for (const { chatId: dChatId, messageId } of order.driverMessageIds || []) {
        if (dChatId === chatId) continue;
        await editMessage(token, dChatId, messageId, takenText, { inline_keyboard: [] });
      }

      // Send confirmation with "Money Collected" button to this driver
      const STORE_FRONTEND_URL = process.env.STORE_FRONTEND_URL || "http://localhost:5174";
      const deliveryPageUrl = `${STORE_FRONTEND_URL}/delivery/${order._id}`;
      const { text, replyMarkup } = buildDriverConfirmMessage(order, deliveryPageUrl);
      await sendMessage(token, chatId, text, replyMarkup);
    }

    // Notify admin via socket
    const io = getIO();
    if (io) {
      io.to(`store_${order.storeId._id}_admin`).emit("order_status_changed", {
        orderId: order._id, orderNumber: order.orderNumber,
        status: order.status, driverName: name,
      });
    }

    res.json({ message: "Order accepted", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── GET /api/orders/pending-sales  (admin/cashier) ─────────── */
export const getPendingSales = async (req, res) => {
  try {
    const sales = await Sale.find({ storeId: req.storeId, status: "pending_payment" })
      .populate("orderId", "orderNumber customer")
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
