/**
 * Run ONCE to generate the RSA-2048 key pair used for signing licenses.
 * Usage: node tools/generate-keys.js
 *
 * Output:
 *   tools/keys/private.pem       ← KEEP SECRET — never commit or share
 *   backend/src/keys/public.pem  ← safe to bundle inside the distributed app
 */
const { generateKeyPairSync } = require("crypto");
const { writeFileSync, mkdirSync, existsSync } = require("fs");
const { join } = require("path");

const keysDir       = join(__dirname, "keys");
const backendKeyDir = join(__dirname, "..", "backend", "src", "keys");

mkdirSync(keysDir,       { recursive: true });
mkdirSync(backendKeyDir, { recursive: true });

const privatePath = join(keysDir, "private.pem");
if (existsSync(privatePath)) {
  console.log("⚠  Private key already exists at tools/keys/private.pem");
  console.log("   Delete it first if you really want to regenerate (all old licenses will break).");
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding:  { type: "spki",  format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync(join(keysDir, "private.pem"),     privateKey, { mode: 0o600 });
writeFileSync(join(keysDir, "public.pem"),       publicKey);
writeFileSync(join(backendKeyDir, "public.pem"), publicKey);

console.log("✅ RSA-2048 key pair generated:");
console.log("   🔐 PRIVATE : tools/keys/private.pem          ← NEVER share or commit this");
console.log("   🌐 PUBLIC  : backend/src/keys/public.pem     ← bundled inside every app build");
console.log("");
console.log("⚠  tools/keys/ is already in .gitignore — confirm before committing.");
