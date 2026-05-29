import express from "express";
import {
  getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getWarehouseStock, receiveSupplier, moveToWarehouse, moveFromWarehouse,
} from "../controllers/warehouse.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/",                  protect,           getWarehouses);
router.post("/",                 protect, isAdmin,  createWarehouse);
router.put("/:id",               protect, isAdmin,  updateWarehouse);
router.delete("/:id",            protect, isAdmin,  deleteWarehouse);
router.get("/:id/stock",         protect,           getWarehouseStock);
router.post("/receive-supplier", protect, isAdmin,  receiveSupplier);
router.post("/move-to",          protect, isAdmin,  moveToWarehouse);
router.post("/move-from",        protect, isAdmin,  moveFromWarehouse);

export default router;
