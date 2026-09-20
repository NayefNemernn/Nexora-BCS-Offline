import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { preloadWhisper, transcribeAudio } from "../voice/whisperClient";

/**
 * useWhisperInput — offline voice input for the desktop app.
 *
 * Electron ships without Google's speech-service keys, so the browser's
 * SpeechRecognition API always fails there with a "network" error. This hook
 * has the same return shape as the Web Speech version but records the mic and
 * transcribes it on-device with Whisper (see voice/whisper.worker.js).
 *
 * Flow: tap mic -> records -> stops on tap, or automatically after a pause in
 * speech -> `busy` while transcribing -> onResult(text) once with the result.
 */

const LANG_NAMES = { ar: "arabic", en: "english", fr: "french" };
const toWhisperLang = (lang) => (lang && lang !== "auto" ? LANG_NAMES[lang.split("-")[0]] ?? null : null);

const SPEECH_RMS     = 0.01;    // mic level above this counts as speech
const MIN_SAMPLES    = 16000 * 0.3;
const NO_SPEECH_MS   = 8000;    // give up if nothing is said
const TIMING = {
  single:     { silenceMs: 1500, maxMs: 20000 },
  continuous: { silenceMs: 3000, maxMs: 60000 },
};

// Whisper writes Arabic-Indic digits and adds sentence punctuation; inputs want plain text/ASCII digits.
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const cleanTranscript = (text) =>
  text
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s.,،؛!?؟]+$/u, "")
    .trim();

async function decodeTo16kMono(blob) {
  const ctx = new OfflineAudioContext(1, 1, 16000); // decodeAudioData resamples to the context's rate
  const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  return audio.getChannelData(0).slice();
}

function explainMicError(err) {
  if (err?.name === "NotAllowedError" || err?.name === "SecurityError")
    return "Microphone is blocked. Allow it in Windows Settings → Privacy & security → Microphone.";
  if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError")
    return "No microphone found. Connect one and try again.";
  return "Could not start the microphone.";
}

export function useWhisperInput(onResult, lang = "ar-LB", continuous = false) {
  const [listening, setListening] = useState(false);
  const [busy, setBusy]           = useState(false); // model loading / transcribing

  const sessionRef  = useRef(null); // { stop(manual) } while recording
  const busyRef     = useRef(false);
  const mountedRef  = useRef(true);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    typeof Worker !== "undefined";

  const setBusyBoth = (v) => { busyRef.current = v; if (mountedRef.current) setBusy(v); };

  const transcribe = useCallback(async (blob) => {
    setBusyBoth(true);
    try {
      const samples = await decodeTo16kMono(blob);
      if (samples.length < MIN_SAMPLES) return;
      const text = cleanTranscript(await transcribeAudio(samples, toWhisperLang(lang)));
      if (text && mountedRef.current) onResultRef.current?.(text);
    } catch (err) {
      console.error("[voice] transcription failed:", err);
      toast.error("Voice input failed. Please try again.");
    } finally {
      setBusyBoth(false);
    }
  }, [lang]);

  const startListening = useCallback(async () => {
    if (!supported || sessionRef.current || busyRef.current) return;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      console.error("[voice] getUserMedia failed:", err);
      toast.error(explainMicError(err));
      return;
    }
    if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

    const { silenceMs, maxMs } = continuous ? TIMING.continuous : TIMING.single;
    const recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    // Level meter: lets us stop by itself when the user finishes talking.
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    const startedAt = performance.now();
    let heardSpeech = false;
    let lastVoiceAt = startedAt;
    let discard     = false;
    let stopping    = false;

    const stop = ({ manual = false, drop = false } = {}) => {
      if (stopping) return;
      stopping = true;
      discard  = drop || (!manual && !heardSpeech); // auto-stop with no speech heard = nothing to transcribe
      clearInterval(timer);
      if (recorder.state !== "inactive") recorder.stop();
    };

    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const now = performance.now();

      if (Math.sqrt(sum / samples.length) > SPEECH_RMS) { heardSpeech = true; lastVoiceAt = now; }

      if (heardSpeech && now - lastVoiceAt > silenceMs) stop();
      else if (!heardSpeech && now - startedAt > NO_SPEECH_MS) stop();
      else if (now - startedAt > maxMs) stop();
    }, 100);

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      audioCtx.close().catch(() => {});
      sessionRef.current = null;
      if (mountedRef.current) setListening(false);
      if (!discard && chunks.length) transcribe(new Blob(chunks, { type: recorder.mimeType }));
    };

    sessionRef.current = { stop };
    recorder.start();
    setListening(true);

    // Load the model while the user is still talking so results appear sooner.
    preloadWhisper().catch((err) => console.error("[voice] model preload failed:", err));
  }, [supported, continuous, transcribe]);

  const stopListening = useCallback(() => sessionRef.current?.stop({ manual: true }), []);

  const toggle = useCallback(() => {
    if (busyRef.current) return;
    if (sessionRef.current) stopListening();
    else startListening();
  }, [startListening, stopListening]);

  // Release the mic if the component unmounts mid-recording.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current?.stop({ drop: true });
    };
  }, []);

  return { listening, busy, startListening, stopListening, toggle, supported };
}
