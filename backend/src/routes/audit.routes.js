// audit.routes.js
import express from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { protect, isAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/", protect, isAdmin, getAuditLogs);

export default router;