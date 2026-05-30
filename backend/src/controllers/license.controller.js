import os from "os";
import Store from "../models/Store.js";
import User  from "../models/User.js";
import {
  getMachineMAC,
  parseLicenseFile,
  parseRenewalCode,
  parseAddDeviceCode,
  parsePasswordResetCode,
} from "../services/licenseManager.js";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// GET /api/license/status
export const getLicenseStatus = async (req, res) => {
  try {
    const store = req.user?.storeId
      ? await Store.findById(req.user.storeId)
      : null;

    if (!store || !store.licenseId) {
      return res.json({ licensed: false });
    }

    const mac          = getMachineMAC();
    const now          = new Date();
    const expiresAt    = store.licenseExpiresAt;
    const daysLeft     = expiresAt
      ? Math.ceil((expiresAt - now) / 86400000)
      : null;

    res.json({
      licensed:       true,
      licenseId:      store.licenseId,
      expiresAt,
      daysRemaining:  daysLeft,
      expired:        expiresAt ? expiresAt < now : false,
      allowedMACs:    store.allowedMACs,
      maxDevices:     store.maxLicenseDevices,
      currentMAC:     mac,
      macAuthorized:  store.allowedMACs.includes(mac),
      hostname:       os.hostname(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/license/renew   body: { renewalCode }
export const renewLicense = async (req, res) => {
  try {
    const { renewalCode } = req.body;
    if (!renewalCode) return res.status(400).json({ message: "renewalCode is required." });

    const renewal = parseRenewalCode(renewalCode);

    const store = await Store.findOne({ licenseId: renewal.licenseId });
    if (!store) {
      return res.status(404).json({
        message: "No license with that ID is installed on this machine.",
      });
    }

    store.licenseExpiresAt = new Date(renewal.newExpiresAt);
    store.planExpiresAt    = new Date(renewal.newExpiresAt);
    await store.save();

    res.json({
      message:       "License renewed successfully.",
      newExpiresAt:  store.licenseExpiresAt,
      daysRemaining: Math.ceil((store.licenseExpiresAt - new Date()) / 86400000),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/license/add-device   body: { deviceCode }
export const addDevice = async (req, res) => {
  try {
    const { deviceCode } = req.body;
    if (!deviceCode) return res.status(400).json({ message: "deviceCode is required." });

    const auth = parseAddDeviceCode(deviceCode);

    const store = await Store.findOne({ licenseId: auth.licenseId });
    if (!store) {
      return res.status(404).json({
        message: "No license with that ID is installed on this machine.",
      });
    }

    const mac = auth.macAddress.toLowerCase();
    if (!store.allowedMACs.includes(mac)) {
      if (store.allowedMACs.length >= (store.maxLicenseDevices || 1)) {
        return res.status(403).json({
          message: `Device limit reached (${store.maxLicenseDevices}). Ask your provider to increase the device count.`,
        });
      }
      store.allowedMACs.push(mac);
      await store.save();
    }

    res.json({ message: "Device authorized successfully.", macAddress: mac });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/license/machine-info   (used by superadmin to find client MAC before generating add-device code)
export const getMachineInfo = async (req, res) => {
  res.json({
    mac:      getMachineMAC(),
    hostname: os.hostname(),
    platform: process.platform,
  });
};

// POST /api/license/reset-password   body: { resetCode }
// Public — user may be locked out so no auth required.
export const applyPasswordReset = async (req, res) => {
  try {
    const { resetCode } = req.body;
    if (!resetCode) return res.status(400).json({ message: "resetCode is required." });

    const reset = parsePasswordResetCode(resetCode);

    const store = await Store.findOne({ licenseId: reset.licenseId });
    if (!store) return res.status(404).json({ message: "No license with that ID is installed on this machine." });

    const admin = await User.findOne({ storeId: store._id, role: "admin" });
    if (!admin) return res.status(404).json({ message: "Admin user not found." });

    // adminPasswordHash is already bcrypt-hashed; the pre-save hook detects this and skips re-hashing
    admin.password = reset.adminPasswordHash;
    admin.devices  = [];       // invalidate all existing sessions
    admin.sessionToken = null;
    await admin.save();

    res.json({ ok: true, message: "Password reset successfully. Please log in with your new password." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/license/check   (public — called by Electron before showing UI)
export const checkLicensePublic = async (req, res) => {
  try {
    const store = await Store.findOne({ licenseId: { $exists: true, $ne: null } });
    if (!store) return res.json({ licensed: false });

    const now      = new Date();
    const expired  = store.licenseExpiresAt ? store.licenseExpiresAt < now : false;
    res.json({ licensed: !expired, expired, expiresAt: store.licenseExpiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/license/activate   body: { licenseContent: string (raw JSON of .nexora file) }
// Public — used on first launch before any user exists.
export const activateLicense = async (req, res) => {
  const { licenseContent } = req.body;
  if (!licenseContent) return res.status(400).json({ message: "licenseContent is required." });

  // Write to a temp file so parseLicenseFile can read it
  const tmpFile = join(tmpdir(), `nexora-activate-${Date.now()}.nexora`);
  try {
    writeFileSync(tmpFile, typeof licenseContent === "string" ? licenseContent : JSON.stringify(licenseContent));
    const { payload, signature } = parseLicenseFile(tmpFile);

    // Idempotent — reject if already activated with a different license
    const existing = await Store.findOne({ licenseId: payload.licenseId });
    if (existing) {
      return res.json({ ok: true, message: "License already activated.", alreadyActive: true });
    }

    const store = await Store.create({
      name:              payload.storeName,
      slug:              payload.storeSlug,
      plan:              "enterprise",
      maxUsers:          payload.maxUsers      || 50,
      maxProducts:       payload.maxProducts   || 999999,
      currency:          payload.currency      || "USD",
      currencySymbol:    payload.currencySymbol || "$",
      language:          payload.language      || "en",
      active:            true,
      licenseId:         payload.licenseId,
      licenseSignature:  signature,
      licenseIssuedAt:   payload.issuedAt ? new Date(payload.issuedAt) : null,
      licenseExpiresAt:  new Date(payload.expiresAt),
      maxLicenseDevices: payload.maxDevices    || 1,
      allowedMACs:       [],
      planExpiresAt:     new Date(payload.expiresAt),
    });

    const admin = new User({
      username:   payload.adminUsername,
      password:   payload.adminPasswordHash || payload.adminPassword,
      role:       "admin",
      storeId:    store._id,
      active:     true,
      maxDevices: payload.maxDevices || 1,
    });
    await admin.save();

    res.json({
      ok:         true,
      message:    `License activated for "${payload.storeName}".`,
      storeName:  payload.storeName,
      expiresAt:  store.licenseExpiresAt,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  } finally {
    try { if (existsSync(tmpFile)) unlinkSync(tmpFile); } catch {}
  }
};
