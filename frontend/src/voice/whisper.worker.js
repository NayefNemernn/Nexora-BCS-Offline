// Runs Whisper speech-to-text fully offline inside a Web Worker so the UI never
// freezes while the model loads or transcribes. Model + WASM runtime are served
// from the app's own origin (see scripts/setup-voice-model.mjs).
import { pipeline, env, Tensor } from "@huggingface/transformers";

const MODEL = "whisper-base"; // keep in sync with scripts/setup-voice-model.mjs

env.allowRemoteModels = false;             // never reach for the internet
env.allowLocalModels  = true;
env.localModelPath    = `${self.location.origin}/models/`;
env.useBrowserCache   = false;             // files are already local; don't duplicate 78 MB in Cache Storage
env.backends.onnx.wasm.wasmPaths  = `${self.location.origin}/ort/`;
// Multi-threaded WASM needs SharedArrayBuffer (enabled for the desktop window in electron/main.js).
// Fall back to 1 thread wherever it isn't available (plain browser tab).
env.backends.onnx.wasm.numThreads =
  typeof SharedArrayBuffer !== "undefined"
    ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) >> 1))
    : 1;

let asrPromise = null;

function loadModel() {
  if (!asrPromise) {
    asrPromise = pipeline("automatic-speech-recognition", MODEL, { device: "wasm", dtype: "q8" })
      .catch((err) => { asrPromise = null; throw err; }); // allow a retry after a failed load
  }
  return asrPromise;
}

// transformers.js does not auto-detect the spoken language — with no language set it
// silently assumes English, which garbles Arabic. So we do it ourselves: run one decoder
// step after <|startoftranscript|> and see which language token the model expects next,
// restricted to the languages this shop actually uses. The (expensive) encoder output from
// this step is handed to generate() so the audio is only encoded once.
const START_OF_TRANSCRIPT = 50258n;
const LANGUAGE_TOKENS = { english: 50259, arabic: 50272, french: 50265 };
const MAX_WINDOW = 16000 * 30; // Whisper looks at 30 s at a time

async function transcribeWithDetection(asr, audio) {
  const { input_features } = await asr.processor(audio);

  // Run the encoder once ourselves, then reuse its output for both the language probe and
  // the transcription. (generate() only forwards inputs named in forward_params, and
  // Whisper's list omits encoder_outputs — so add it, otherwise the encoder is re-run.
  // transformers.js is pinned to an exact version; if these internals ever change the
  // caller falls back to the plain pipeline: slower, never wrong.)
  if (!asr.model.forward_params.includes("encoder_outputs")) {
    asr.model.forward_params = [...asr.model.forward_params, "encoder_outputs"];
  }
  const encoded = await asr.model.sessions.model.run({ input_features: input_features.ort_tensor });
  const encoder_outputs = new Tensor(encoded.last_hidden_state);

  const { logits } = await asr.model.forward({
    encoder_outputs,
    decoder_input_ids: new Tensor("int64", BigInt64Array.of(START_OF_TRANSCRIPT), [1, 1]),
  });

  let language = "english";
  let bestScore = -Infinity;
  for (const [name, tokenId] of Object.entries(LANGUAGE_TOKENS)) {
    if (logits.data[tokenId] > bestScore) { language = name; bestScore = logits.data[tokenId]; }
  }

  const tokens = await asr.model.generate({
    inputs: input_features,
    encoder_outputs,
    language,
    task: "transcribe",
    max_new_tokens: 200,
  });
  const [text] = asr.tokenizer.batch_decode(tokens, { skip_special_tokens: true });
  return { text, language };
}

self.onmessage = async ({ data }) => {
  const { id, type } = data;
  try {
    if (type === "load") {
      await loadModel();
      self.postMessage({ id, ok: true });
    } else if (type === "transcribe") {
      const asr = await loadModel();
      if (!data.language && data.audio.length <= MAX_WINDOW) {
        try {
          const { text, language } = await transcribeWithDetection(asr, data.audio);
          self.postMessage({ id, ok: true, text: text.trim(), language });
          return;
        } catch (err) {
          console.warn("[voice] language detection failed, falling back to English:", err);
        }
      }
      // Explicit language, audio longer than one window (chunked by the pipeline), or detection failed.
      const language = data.language || "english";
      const out = await asr(data.audio, { task: "transcribe", language, chunk_length_s: 30 });
      self.postMessage({ id, ok: true, text: (out.text || "").trim(), language });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: err?.message || String(err) });
  }
};
