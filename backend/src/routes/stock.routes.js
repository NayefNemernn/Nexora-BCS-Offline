// stock.routes.js
import express from "express";
import {
  adjustStock, getStockLogs,
  addToWarehouse, receiveToWarehouse, transferToShowroom,
  scanReceipt,
} from "../controllers/stock.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();
router.post("/adjust",                    protect, isAdmin, adjustStock);
router.get("/logs",                       protect, getStockLogs);
router.post("/warehouse/add",             protect, isAdmin, addToWarehouse);          // showroom → warehouse
router.post("/warehouse/receive-supplier",protect, isAdmin, receiveToWarehouse);      // supplier → warehouse
router.post("/warehouse/transfer",        protect, isAdmin, transferToShowroom);       // warehouse → showroom
router.post("/scan-receipt",              protect, isAdmin, upload.single("receipt"), scanReceipt);

export default router;
