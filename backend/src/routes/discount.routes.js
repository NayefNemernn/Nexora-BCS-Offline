import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount, validateCoupon } from "../controllers/discount.controller.js";

const router = express.Router();
router.get("/",              protect, isAdmin, getDiscounts);
router.post("/",             protect, isAdmin, createDiscount);
router.post("/validate",     protect, validateCoupon);
router.put("/:id",           protect, isAdmin, updateDiscount);
router.delete("/:id",        protect, isAdmin, deleteDiscount);
export default router;