import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import {
  getBatches, getBatchesForProduct,
  createBatch, updateBatch, adjustBatchQty, deleteBatch,
} from "../controllers/batch.controller.js";

const router = express.Router();

router.get("/",                      protect, isAdmin, getBatches);
router.get("/product/:productId",    protect, getBatchesForProduct);
router.post("/",                     protect, isAdmin, createBatch);
router.put("/:id",                   protect, isAdmin, updateBatch);
router.patch("/:id/adjust",          protect, isAdmin, adjustBatchQty);
router.delete("/:id",                protect, isAdmin, deleteBatch);

export default router;
