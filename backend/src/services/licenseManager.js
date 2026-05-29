/**
 * Offline License Manager
 *
 * Handles:
 *  - Reading & verifying signed .nexora license files (RSA-SHA256)
 *  - Importing a license into MongoDB on first launch
 *  - MAC address detection for hardware locking
 *  - Validating renewal codes and add-device codes
 */

import { createVerify } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";
import User  from "../models/User.js";
import Store from "../models/Store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_KEY_PATH = join(__dirname, "../keys/public.pem");

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMachineMAC() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (!iface.internal && iface.mac && iface.mac !== "00:00:00:00:00:00") {
        return iface.mac.toLowerCase();
      }
    }
  }
  return "unknown";
}

function getPublicKey() {
  if (!existsSync(PUBLIC_KEY_PATH)) return null;
  const content = readFileSync(PUBLIC_KEY_PATH, "utf8");
  if (content.startsWith("PLACEHOLDER")) return null;
  return content;
}

function verifySignature(payload, signature) {
  const publicKey = getPublicKey();
  if (!publicKey) return false;
  try {
    const verify = createVerify("SHA256");
    verify.update(JSON.stringify(payload));
    verify.end();
    return verify.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

function fromCode(code) {
  return JSON.parse(Buffer.from(code.trim(), "base64").toString("utf8"));
}

// ── Parse & validate a .nexora license file ───────────────────────────────────

export function parseLicenseFile(filePath) {
  if (!existsSync(filePath)) throw new Error("License file not found: " + filePath);

  let licenseObj;
  try {
    licenseObj = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("License file is not valid JSON.");
  }

  const { payload, signature } = licenseObj;
  if (!payload || !signature) throw new Error("License file is missing payload or signature.");

  if (!verifySignature(payload, signature)) {
    throw new Error("License signature is invalid — the file may have been tampered with.");
  }

  if (!payload.expiresAt) throw new Error("License has no expiry date.");
  if (new Date(payload.expiresAt) < new Date()) {
    throw new Error(`License expired on ${new Date(payload.expiresAt).toDateString()}. Contact your provider to renew.`);
  }

  return { payload, signature };
}

// ── Import license into MongoDB (first-launch seeding) ───────────────────────

export async function importLicenseIfNeeded() {
  const licenseFile = process.env.LICENSE_FILE;
  if (!licenseFile) return;

  try {
    const { payload, signature } = parseLicenseFile(licenseFile);

    // Idempotent — skip if already imported
    const existing = await Store.findOne({ licenseId: payload.licenseId });
    if (existing) {
      console.log(`[License] Already imported (licenseId=${payload.licenseId})`);
      return;
    }

    // Create the store
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
      licenseExpiresAt:  new Date(payload.expiresAt),
      maxLicenseDevices: payload.maxDevices    || 1,
      allowedMACs:       [],
      planExpiresAt:     new Date(payload.expiresAt),
    });

    // Create the admin user — password is plaintext from the license, bcrypt hook fires on save
    const admin = new User({
      username: payload.adminUsername,
      password: payload.adminPassword,
      role:     "admin",
      storeId:  store._id,
      active:   true,
      maxDevices: payload.maxDevices || 1,
    });
    await admin.save();

    console.log(`[License] ✅ Imported store "${payload.storeName}" (expires ${new Date(payload.expiresAt).toDateString()})`);
  } catch (err) {
    console.error("[License] ❌ Failed to import license:", err.message);
  }
}

// ── Validate a renewal code ───────────────────────────────────────────────────

export function parseRenewalCode(code) {
  let parsed;
  try { parsed = fromCode(code); } catch { throw new Error("Invalid renewal code format."); }

  const { payload, signature } = parsed;
  if (!payload || !signature)          throw new Error("Renewal code is incomplete.");
  if (payload.type !== "renewal")      throw new Error("This is not a renewal code.");
  if (!verifySignature(payload, signature)) throw new Error("Renewal code signature is invalid.");
  if (!payload.licenseId)              throw new Error("Renewal code missing licenseId.");
  if (!payload.newExpiresAt)           throw new Error("Renewal code missing new expiry date.");

  return payload;
}

// ── Validate an add-device code ───────────────────────────────────────────────

export function parseAddDeviceCode(code) {
  let parsed;
  try { parsed = fromCode(code); } catch { throw new Error("Invalid device code format."); }

  const { payload, signature } = parsed;
  if (!payload || !signature)           throw new Error("Device code is incomplete.");
  if (payload.type !== "add-device")    throw new Error("This is not an add-device code.");
  if (!verifySignature(payload, signature)) throw new Error("Device code signature is invalid.");
  if (!payload.licenseId)               throw new Error("Device code missing licenseId.");
  if (!payload.macAddress)              throw new Error("Device code missing MAC address.");

  return payload;
}
