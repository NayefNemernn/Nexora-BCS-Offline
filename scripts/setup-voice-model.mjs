// Prepares the offline voice-input assets used by the desktop app:
//   1. Whisper speech model  -> frontend/public/models/<MODEL>/
//   2. ONNX runtime (WASM)   -> frontend/public/ort/
//
// Both are git-ignored (too large to commit). Run automatically by
// `npm run build:frontend`; needs internet only the first time — files that
// already exist are skipped, so later builds work fully offline.
//
// To use a bigger/more accurate model (e.g. whisper-small) change MODEL here
// AND in frontend/src/voice/whisper.worker.js.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MODEL = process.env.VOICE_MODEL || "whisper-base";
const HF_REPO = `Xenova/${MODEL}`;
const MODEL_FILES = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "added_tokens.json",
  "special_tokens_map.json",
  "vocab.json",
  "merges.txt",
  "normalizer.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
];
const ORT_FILES = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "frontend", "public");
const modelDir = path.join(publicDir, "models", MODEL);
const ortDir = path.join(publicDir, "ort");

const exists = (p) => fs.existsSync(p) && fs.statSync(p).size > 0;

async function download(rel) {
  const dest = path.join(modelDir, rel);
  if (exists(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const url = `https://huggingface.co/${HF_REPO}/resolve/main/${rel}`;
  console.log(`[voice] downloading ${rel}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url} -> HTTP ${res.status}`);

  // Write to a .part file first so an interrupted download is never mistaken for a complete one.
  const part = `${dest}.part`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part));
  fs.renameSync(part, dest);
}

function copyOrt() {
  // Nested copy is the one matching transformers.js; fall back to a hoisted one.
  const candidates = [
    path.join(root, "frontend", "node_modules", "@huggingface", "transformers", "node_modules", "onnxruntime-web", "dist"),
    path.join(root, "frontend", "node_modules", "onnxruntime-web", "dist"),
  ];
  const src = candidates.find((dir) => ORT_FILES.every((f) => exists(path.join(dir, f))));
  if (!src) throw new Error("onnxruntime-web not found — run `npm install` in frontend/ first.");

  fs.mkdirSync(ortDir, { recursive: true });
  for (const f of ORT_FILES) {
    const dest = path.join(ortDir, f);
    if (!exists(dest)) fs.copyFileSync(path.join(src, f), dest);
  }
}

try {
  copyOrt();
  for (const rel of MODEL_FILES) await download(rel);
  console.log("[voice] offline voice assets ready");
} catch (err) {
  // Don't fail the whole build — the app still works, only the mic button is affected.
  console.warn(`[voice] WARNING: could not prepare offline voice model: ${err.message}`);
  console.warn("[voice] Voice input will be unavailable in the desktop app until this succeeds.");
}
