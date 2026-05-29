import os from "os";
import Store from "../models/Store.js";
import {
  getMachineMAC,
  parseRenewalCode,
  parseAddDeviceCode,
} from "../services/licenseManager.js";

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
