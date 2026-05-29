import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getLicenseStatus,
  renewLicense,
  addDevice,
  getMachineInfo,
} from "../controllers/license.controller.js";

const router = express.Router();

// Machine info — no auth needed (used on login screen to show MAC)
router.get("/machine-info", getMachineInfo);

// All other routes require a logged-in user
router.get("/status",        protect, getLicenseStatus);
router.post("/renew",        protect, renewLicense);
router.post("/add-device",   protect, addDevice);

export default router;
