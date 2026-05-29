import express from "express";
import upload from "../middleware/upload.middleware.js";
import multer from "multer";
import { protect } from "../middleware/auth.middleware.js";
import {
  getAllProducts, getProductByBarcode, createProduct,
  updateProduct, deleteProduct, importProducts,
  getProductStats, getProfitabilityReport, getAlerts,
} from "../controllers/product.controller.js";
import { parseProductPrompt } from "../controllers/ai.controller.js";

const router = express.Router();
const excelUpload = multer({ storage: multer.memoryStorage() });

router.get("/",                 protect, getAllProducts);
router.get("/profitability",    protect, getProfitabilityReport);
router.get("/alerts",           protect, getAlerts);
router.get("/barcode/:barcode", protect, getProductByBarcode);
router.get("/:id/stats",        protect, getProductStats);
router.post("/",                protect, upload.single("image"), createProduct);
router.post("/import",          protect, excelUpload.single("file"), importProducts);
router.post("/parse-prompt",    protect, parseProductPrompt);
router.put("/:id",              protect, upload.single("image"), updateProduct);
router.delete("/:id",           protect, deleteProduct);

export default router;