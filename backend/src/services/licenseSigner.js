/**
 * License signing service — uses the RSA private key stored in the
 * superadmin's userData directory to sign license payloads.
 *
 * Private key location (checked in order):
 *   1. process.env.USER_DATA_PATH + '/license-private.pem'
 *   2. process.env.LICENSE_PRIVATE_KEY_PATH  (explicit override)
 */

import { createSign } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import os from "os";

function getPrivateKeyPath() {
  if (process.env.LICENSE_PRIVATE_KEY_PATH) return process.env.LICENSE_PRIVATE_KEY_PATH;
  if (process.env.USER_DATA_PATH)           return join(process.env.USER_DATA_PATH, "license-private.pem");

  // Fallback: compute the standard Electron userData path directly from OS env vars.
  // This works when USER_DATA_PATH isn't forwarded (e.g. older installed builds).
  const appData = process.env.APPDATA
    || (process.platform === "darwin" ? join(os.homedir(), "Library", "Application Support") : null)
    || join(os.homedir(), ".config");
  return join(appData, "nexora-pos", "license-private.pem");
}

export function isPrivateKeyConfigured() {
  const p = getPrivateKeyPath();
  return !!(p && existsSync(p));
}

export function savePrivateKey(pemContent) {
  const p = getPrivateKeyPath();
  if (!p) throw new Error("USER_DATA_PATH is not set — cannot save private key.");
  // Basic sanity check
  if (!pemContent.includes("PRIVATE KEY")) throw new Error("Not a valid PEM private key.");
  writeFileSync(p, pemContent.trim() + "\n", { mode: 0o600 });
}

function loadPrivateKey() {
  const p = getPrivateKeyPath();
  if (!p || !existsSync(p)) throw new Error("Private key not found. Go to License Manager → Setup to upload your private key.");
  return readFileSync(p, "utf8");
}

export function signPayload(payload) {
  const privateKey = loadPrivateKey();
  const signer = createSign("SHA256");
  signer.update(JSON.stringify(payload));
  signer.end();
  return signer.sign(privateKey, "base64");
}

function toCode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

// ── Generate a full .nexora license object ─────────────────────────────────────

export function buildLicenseObject({ licenseId, storeName, storeSlug, adminUsername, adminPasswordHash, maxDevices, maxUsers, maxProducts, currency, currencySymbol, language, issuedAt, expiresAt }) {
  const payload = {
    licenseId, version: 1, storeName, storeSlug, adminUsername, adminPasswordHash,
    maxDevices, maxUsers, maxProducts, currency, currencySymbol, language, issuedAt, expiresAt,
  };
  const signature = signPayload(payload);
  return { payload, signature };
}

// ── Generate a renewal code (base64 string) ────────────────────────────────────

export function buildRenewalCode(licenseId, newExpiresAt) {
  const payload = { type: "renewal", licenseId, newExpiresAt, issuedAt: new Date().toISOString() };
  const signature = signPayload(payload);
  return toCode({ payload, signature });
}

// ── Generate an add-device code (base64 string) ────────────────────────────────

export function buildAddDeviceCode(licenseId, macAddress) {
  const payload = { type: "add-device", licenseId, macAddress: macAddress.toLowerCase().trim(), issuedAt: new Date().toISOString() };
  const signature = signPayload(payload);
  return toCode({ payload, signature });
}

// ── Generate a password reset code (base64 string) ─────────────────────────────

export function buildPasswordResetCode(licenseId, adminPasswordHash) {
  const payload = { type: "password-reset", licenseId, adminPasswordHash, issuedAt: new Date().toISOString() };
  const signature = signPayload(payload);
  return toCode({ payload, signature });
}
