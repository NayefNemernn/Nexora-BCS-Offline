import express from "express";
import { protect, isAdmin } from "../middleware/auth.middleware.js";
import { getActiveShift, getShifts, openShift, closeShift, addCashEvent } from "../controllers/shift.controller.js";

const router = express.Router();
router.get("/active",        protect, getActiveShift);
router.get("/",              protect, isAdmin, getShifts);
router.post("/open",         protect, openShift);
router.post("/:id/close",    protect, closeShift);
router.post("/:id/cash-event", protect, addCashEvent);
export default router;