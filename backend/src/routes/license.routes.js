import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getLicenseStatus,
  renewLicense,
  addDevice,
  getMachineInfo,
  checkLicensePublic,
  activateLicense,
  applyPasswordReset,
} from "../controllers/license.controller.js";

const router = express.Router();

// Public — no auth needed
router.get("/machine-info",       getMachineInfo);
router.get("/check",              checkLicensePublic);
router.post("/activate",          activateLicense);
router.post("/reset-password",    applyPasswordReset);

// All other routes require a logged-in user
router.get("/status",        protect, getLicenseStatus);
router.post("/renew",        protect, renewLicense);
router.post("/add-device",   protect, addDevice);

export default router;
