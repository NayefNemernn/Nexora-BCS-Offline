import { randomUUID } from "crypto";
import LicenseRecord from "../models/LicenseRecord.js";
import {
  isPrivateKeyConfigured,
  savePrivateKey,
  buildLicenseObject,
  buildRenewalCode,
  buildAddDeviceCode,
} from "../services/licenseSigner.js";
import { getMachineMAC } from "../services/licenseManager.js";

// GET /api/superadmin/licenses/key-status
export const getKeyStatus = async (req, res) => {
  res.json({ configured: isPrivateKeyConfigured() });
};

// POST /api/superadmin/licenses/setup-key   body: { privateKeyPem }
export const setupPrivateKey = async (req, res) => {
  try {
    const { privateKeyPem } = req.body;
    if (!privateKeyPem) return res.status(400).json({ message: "privateKeyPem is required." });
    savePrivateKey(privateKeyPem);
    res.json({ message: "Private key saved successfully." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/superadmin/licenses/create
// body: { storeName, adminUsername, adminPassword, maxDevices, daysValid, notes }
export const createLicense = async (req, res) => {
  try {
    if (!isPrivateKeyConfigured()) {
      return res.status(400).json({ message: "Private key not configured. Go to License Manager → Setup first." });
    }

    const {
      storeName, adminUsername, adminPassword,
      maxDevices = 1, daysValid = 365,
      maxUsers = 50, maxProducts = 999999,
      currency = "USD", currencySymbol = "$", language = "en",
      notes = "",
    } = req.body;

    if (!storeName || !adminUsername || !adminPassword) {
      return res.status(400).json({ message: "storeName, adminUsername and adminPassword are required." });
    }

    const licenseId  = randomUUID();
    const issuedAt   = new Date().toISOString();
    const expiresAt  = new Date(Date.now() + Number(daysValid) * 86400000).toISOString();
    const storeSlug  = storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40)
                       + "-" + Date.now().toString(36);

    const licenseObj = buildLicenseObject({
      licenseId, storeName, storeSlug, adminUsername, adminPassword,
      maxDevices: Number(maxDevices), maxUsers, maxProducts,
      currency, currencySymbol, language, issuedAt, expiresAt,
    });

    const nexoraContent = JSON.stringify(licenseObj, null, 2);

    await LicenseRecord.create({
      licenseId, storeName, adminUsername,
      maxDevices: Number(maxDevices),
      issuedAt:   new Date(issuedAt),
      expiresAt:  new Date(expiresAt),
      notes,
      nexoraFileContent: nexoraContent,
    });

    res.json({
      message:        "License created.",
      licenseId,
      storeName,
      adminUsername,
      expiresAt,
      maxDevices,
      nexoraContent,   // client downloads this as a .nexora file
      filename:        `${storeName.replace(/\s+/g, "-")}.nexora`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/licenses
export const listLicenses = async (req, res) => {
  try {
    const records = await LicenseRecord.find()
      .sort({ createdAt: -1 })
      .select("-nexoraFileContent");
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/licenses/:licenseId/download
export const downloadLicense = async (req, res) => {
  try {
    const record = await LicenseRecord.findOne({ licenseId: req.params.licenseId });
    if (!record) return res.status(404).json({ message: "License not found." });
    res.json({ nexoraContent: record.nexoraFileContent, filename: `${record.storeName.replace(/\s+/g, "-")}.nexora` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/superadmin/licenses/:licenseId/renew   body: { daysToAdd }
export const renewLicenseRecord = async (req, res) => {
  try {
    if (!isPrivateKeyConfigured()) return res.status(400).json({ message: "Private key not configured." });

    const record = await LicenseRecord.findOne({ licenseId: req.params.licenseId });
    if (!record) return res.status(404).json({ message: "License not found." });

    const daysToAdd     = Number(req.body.daysToAdd) || 365;
    const base          = record.expiresAt > new Date() ? record.expiresAt : new Date();
    const newExpiresAt  = new Date(base.getTime() + daysToAdd * 86400000).toISOString();
    const renewalCode   = buildRenewalCode(record.licenseId, newExpiresAt);

    record.expiresAt = new Date(newExpiresAt);
    record.renewalHistory.push({ renewedAt: new Date(), newExpiresAt: new Date(newExpiresAt) });
    await record.save();

    res.json({ message: "Renewal code generated.", renewalCode, newExpiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/superadmin/licenses/:licenseId/add-device   body: { macAddress }
export const addDeviceToLicense = async (req, res) => {
  try {
    if (!isPrivateKeyConfigured()) return res.status(400).json({ message: "Private key not configured." });

    const { macAddress } = req.body;
    if (!macAddress) return res.status(400).json({ message: "macAddress is required." });

    const record = await LicenseRecord.findOne({ licenseId: req.params.licenseId });
    if (!record) return res.status(404).json({ message: "License not found." });

    const mac        = macAddress.toLowerCase().trim();
    const deviceCode = buildAddDeviceCode(record.licenseId, mac);

    if (!record.addedDevices.find(d => d.mac === mac)) {
      record.addedDevices.push({ mac, addedAt: new Date() });
      await record.save();
    }

    res.json({ message: "Device code generated.", deviceCode, macAddress: mac });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/superadmin/licenses/:licenseId
export const deleteLicenseRecord = async (req, res) => {
  try {
    await LicenseRecord.findOneAndDelete({ licenseId: req.params.licenseId });
    res.json({ message: "License record deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/superadmin/licenses/:licenseId/notes   body: { notes }
export const updateLicenseNotes = async (req, res) => {
  try {
    const record = await LicenseRecord.findOne({ licenseId: req.params.licenseId });
    if (!record) return res.status(404).json({ message: "License not found." });
    record.notes = req.body.notes || "";
    await record.save();
    res.json({ message: "Notes saved." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/superadmin/licenses/machine-mac  — returns this machine's MAC (for add-device flow)
export const getMacInfo = async (req, res) => {
  const { hostname } = await import("os");
  res.json({ mac: getMachineMAC(), hostname: hostname() });
};
