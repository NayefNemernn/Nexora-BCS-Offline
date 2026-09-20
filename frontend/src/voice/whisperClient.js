// One shared Whisper worker for the whole app — every mic button talks to it,
// so the model is loaded into memory once and only when first needed.

let worker = null;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./whisper.worker.js", import.meta.url), { type: "module" });

  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);
    if (data.ok) p.resolve(data);
    else p.reject(new Error(data.error));
  };

  worker.onerror = (e) => {
    // Worker itself died (e.g. failed to load) — fail everything in flight and start fresh next time.
    const err = new Error(e.message || "Voice engine crashed");
    pending.forEach((p) => p.reject(err));
    pending.clear();
    worker.terminate();
    worker = null;
  };
  return worker;
}

function call(message, transfer = []) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, ...message }, transfer);
  });
}

/** Load the model ahead of time (safe to call repeatedly). */
export const preloadWhisper = () => call({ type: "load" });

/** audio: Float32Array of 16 kHz mono samples. language: Whisper language name ("arabic") or null for auto. */
export async function transcribeAudio(audio, language = null) {
  const { text } = await call({ type: "transcribe", audio, language }, [audio.buffer]);
  return text;
}
