import express from "express";
import {
  submitOrder, getOrders, getOrderById, trackOrder,
  acceptOrder, rejectOrder, cancelOrder, markOutForDelivery,
  confirmPayment, getPendingSales,
  getDeliveryOrder, cashCollected, driverAcceptOrder,
} from "../controllers/order.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public
router.post("/",                        submitOrder);
router.get("/track/:id",                trackOrder);
router.get("/delivery/:id",             getDeliveryOrder);
router.patch("/:id/cash-collected",     cashCollected);
router.patch("/:id/driver-accept",      driverAcceptOrder);

// Protected
router.get("/",              protect, getOrders);
router.get("/pending-sales", protect, getPendingSales);
router.get("/:id",           protect, getOrderById);
router.patch("/:id/accept",              protect, isAdmin, acceptOrder);
router.patch("/:id/reject",              protect, isAdmin, rejectOrder);
router.patch("/:id/cancel",              protect, isAdmin, cancelOrder);
router.patch("/:id/out-for-delivery",    protect, markOutForDelivery);
router.patch("/:id/payment-received",    protect, confirmPayment);

export default router;
