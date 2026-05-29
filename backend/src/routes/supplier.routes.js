import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getPurchaseOrders, createPurchaseOrder, deletePurchaseOrder,
} from "../controllers/supplier.controller.js";

const router = express.Router();
router.get("/",                  protect, isAdmin, getSuppliers);
router.post("/",                 protect, isAdmin, createSupplier);
router.put("/:id",               protect, isAdmin, updateSupplier);
router.delete("/:id",            protect, isAdmin, deleteSupplier);

router.get("/orders",            protect, isAdmin, getPurchaseOrders);
router.post("/orders",           protect, isAdmin, createPurchaseOrder);
router.delete("/orders/:id",     protect, isAdmin, deletePurchaseOrder);
export default router;