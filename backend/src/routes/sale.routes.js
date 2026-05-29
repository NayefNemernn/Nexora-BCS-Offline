import express from "express";
import { createSale, getSales, getSaleById, returnSaleItems, voidSale, getProfitLoss } from "../controllers/sale.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/",              protect, createSale);
router.get("/",               protect, getSales);
router.get("/profit-loss",    protect, isAdmin, getProfitLoss);
router.get("/:id",            protect, getSaleById);
router.post("/:id/return",    protect, returnSaleItems);
router.post("/:id/void",      protect, voidSale);

export default router;