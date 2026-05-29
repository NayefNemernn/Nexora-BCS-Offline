/**
 * Nexora License CLI Tool
 * Requires: node tools/generate-keys.js to have been run first.
 *
 * Commands:
 *
 *   Create a new license:
 *     node tools/generate-license.js create "Store Name" adminUser adminPass [maxDevices] [daysValid]
 *     Example: node tools/generate-license.js create "Al Noor Pharmacy" admin Pass123 1 365
 *
 *   Generate a renewal code (extend expiry):
 *     node tools/generate-license.js renew <licenseId> [daysToAdd]
 *     Example: node tools/generate-license.js renew abc-123 365
 *
 *   Generate an add-device code (authorize a new MAC):
 *     node tools/generate-license.js add-device <licenseId> <macAddress>
 *     Example: node tools/generate-license.js add-device abc-123 aa:bb:cc:dd:ee:ff
 */

const { createSign } = require("crypto");
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join }  = require("path");

const PRIVATE_KEY_PATH = join(__dirname, "keys", "private.pem");

function loadPrivateKey() {
  if (!existsSync(PRIVATE_KEY_PATH)) {
    console.error("❌ Private key not found. Run: node tools/generate-keys.js first.");
    process.exit(1);
  }
  return readFileSync(PRIVATE_KEY_PATH, "utf8");
}

function sign(payload) {
  const privateKey = loadPrivateKey();
  const payloadStr = JSON.stringify(payload);
  const signer = createSign("SHA256");
  signer.update(payloadStr);
  signer.end();
  return signer.sign(privateKey, "base64");
}

function toCode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

function randomId() {
  return require("crypto").randomUUID();
}

// ── CREATE LICENSE ────────────────────────────────────────────────────────────
function createLicense(args) {
  const [storeName, adminUsername, adminPassword, maxDevicesArg, daysArg] = args;

  if (!storeName || !adminUsername || !adminPassword) {
    console.error('Usage: node tools/generate-license.js create "Store Name" user pass [maxDevices] [days]');
    process.exit(1);
  }

  const maxDevices = parseInt(maxDevicesArg) || 1;
  const days       = parseInt(daysArg) || 365;
  const licenseId  = randomId();
  const issuedAt   = new Date().toISOString();
  const expiresAt  = new Date(Date.now() + days * 86400000).toISOString();
  const slug       = storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40)
                     + "-" + Date.now().toString(36);

  const payload = {
    licenseId,
    version:       1,
    storeName,
    storeSlug:     slug,
    adminUsername,
    adminPassword,            // stored plaintext — hashed on import by the app
    maxDevices,
    maxUsers:      50,
    maxProducts:   999999,
    currency:      "USD",
    currencySymbol:"$",
    language:      "en",
    issuedAt,
    expiresAt,
  };

  const signature  = sign(payload);
  const licenseObj = { payload, signature };

  mkdirSync(join(__dirname, "output"), { recursive: true });
  const filename = join(__dirname, "output",
    storeName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "") + "-" + Date.now() + ".nexora"
  );
  writeFileSync(filename, JSON.stringify(licenseObj, null, 2), "utf8");

  console.log("");
  console.log("✅ License file generated:");
  console.log(`   File      : ${filename}`);
  console.log(`   License ID: ${licenseId}`);
  console.log(`   Store     : ${storeName}`);
  console.log(`   Admin     : ${adminUsername} / ${adminPassword}`);
  console.log(`   Devices   : up to ${maxDevices}`);
  console.log(`   Expires   : ${new Date(expiresAt).toDateString()} (${days} days)`);
  console.log("");
  console.log("📦 Give the client: app installer + this .nexora file.");
  console.log("🔑 Share the admin password separately (not from the .nexora file).");
}

// ── GENERATE RENEWAL CODE ────────────────────────────────────────────────────
function generateRenewal(args) {
  const [licenseId, daysArg] = args;
  if (!licenseId) {
    console.error("Usage: node tools/generate-license.js renew <licenseId> [days]");
    process.exit(1);
  }

  const days      = parseInt(daysArg) || 365;
  const newExpiry = new Date(Date.now() + days * 86400000).toISOString();

  const payload   = { type: "renewal", licenseId, newExpiresAt: newExpiry, issuedAt: new Date().toISOString() };
  const signature = sign(payload);
  const code      = toCode({ payload, signature });

  console.log("");
  console.log("✅ Renewal code generated:");
  console.log(`   License ID  : ${licenseId}`);
  console.log(`   New expiry  : ${new Date(newExpiry).toDateString()} (+${days} days)`);
  console.log("");
  console.log("RENEWAL CODE (paste into the app Settings → License → Enter Renewal Code):");
  console.log("");
  console.log(code);
  console.log("");
}

// ── GENERATE ADD-DEVICE CODE ─────────────────────────────────────────────────
function generateAddDevice(args) {
  const [licenseId, macAddress] = args;
  if (!licenseId || !macAddress) {
    console.error("Usage: node tools/generate-license.js add-device <licenseId> <macAddress>");
    console.error("Example: node tools/generate-license.js add-device abc-123 aa:bb:cc:dd:ee:ff");
    process.exit(1);
  }

  const mac       = macAddress.toLowerCase().trim();
  const payload   = { type: "add-device", licenseId, macAddress: mac, issuedAt: new Date().toISOString() };
  const signature = sign(payload);
  const code      = toCode({ payload, signature });

  console.log("");
  console.log("✅ Add-device code generated:");
  console.log(`   License ID : ${licenseId}`);
  console.log(`   MAC address: ${mac}`);
  console.log("");
  console.log("DEVICE CODE (paste into the app Settings → License → Add Device):");
  console.log("");
  console.log(code);
  console.log("");
}

// ── ROUTER ───────────────────────────────────────────────────────────────────
const [,, command, ...rest] = process.argv;

switch (command) {
  case "create":     createLicense(rest);    break;
  case "renew":      generateRenewal(rest);  break;
  case "add-device": generateAddDevice(rest); break;
  default:
    console.log("Nexora License Tool");
    console.log("");
    console.log("Commands:");
    console.log('  node tools/generate-license.js create "Store Name" user pass [maxDevices] [days]');
    console.log("  node tools/generate-license.js renew <licenseId> [days]");
    console.log("  node tools/generate-license.js add-device <licenseId> <macAddress>");
}
