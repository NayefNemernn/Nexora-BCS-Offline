import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import {
  getOfferSuggestions,
  getReorderSuggestions,
  savePurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrder,
  deletePurchaseOrder,
} from "../controllers/aiInsights.controller.js";

const router = express.Router();

router.get("/offer-suggestions",   protect, isAdmin, getOfferSuggestions);
router.get("/reorder-suggestions", protect, isAdmin, getReorderSuggestions);

router.get("/purchase-orders",           protect, isAdmin, getPurchaseOrders);
router.post("/purchase-orders",          protect, isAdmin, savePurchaseOrder);
router.put("/purchase-orders/:id",       protect, isAdmin, updatePurchaseOrder);
router.delete("/purchase-orders/:id",    protect, isAdmin, deletePurchaseOrder);

export default router;
