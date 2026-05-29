const { MongoBinaryDownload } = require("mongodb-memory-server-core/lib/util/MongoBinaryDownload");
const path = require("path");
const fs = require("fs");

const DEST = path.join(__dirname, "build-resources", "mongodb-binary", "win");

async function main() {
  console.log("Downloading mongod binary for Windows x64...");

  const downloader = new MongoBinaryDownload({
    downloadDir: DEST,
    platform: "win32",
    arch: "x64",
    version: "7.0.14",
  });

  const binary = await downloader.getMongodPath();
  console.log("Downloaded to:", binary);

  // Copy mongod.exe to the root of the win folder
  const dest = path.join(DEST, "mongod.exe");
  if (binary !== dest) {
    fs.copyFileSync(binary, dest);
    console.log("Copied to:", dest);
  }

  console.log("Done. mongod.exe is ready.");
}

main().catch(err => { console.error(err); process.exit(1); });
