import { useState, useRef, useCallback } from "react";

const hasArabicChars = (text) => /[\u0600-\u06FF]/.test(text);

/**
 * useVoiceInput — continuous speech recognition with:
 *  - no duplicate words (uses event.resultIndex)
 *  - seamless auto-restart when the browser cuts the session
 *  - language auto-detection when lang="auto"
 *    (starts with ar-LB, switches to en-US if no Arabic detected)
 */
export function useVoiceInput(onResult, lang = "ar-LB", continuous = false) {
  const [listening, setListening] = useState(false);

  const recognitionRef  = useRef(null);
  const transcriptRef   = useRef("");   // accumulated final text across restarts
  const activeRef       = useRef(false); // true while we WANT to keep recording
  const currentLangRef  = useRef(lang === "auto" ? "ar-LB" : lang);
  const langLockedRef   = useRef(false); // true after we've chosen a language
  const launchRef       = useRef(null);  // pointer to latest launch() to avoid stale closure
  const onResultRef     = useRef(onResult);
  onResultRef.current   = onResult;

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const launch = useCallback((language) => {
    if (!supported || !activeRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang            = language;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    rec.continuous      = true; // browser-level continuous; we also self-restart for resilience

    rec.onstart = () => setListening(true);

    rec.onresult = (event) => {
      // Use event.resultIndex — only process NEWLY arrived results.
      // Looping from 0 re-counts old results and causes duplicates.
      let newFinal = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newFinal += event.results[i][0].transcript + " ";
        }
      }

      if (newFinal.trim()) {
        transcriptRef.current = transcriptRef.current
          ? transcriptRef.current + " " + newFinal.trim()
          : newFinal.trim();

        // Auto language detection (only when lang="auto" and not yet locked)
        if (lang === "auto" && !langLockedRef.current) {
          langLockedRef.current = true;
          if (!hasArabicChars(transcriptRef.current) && language === "ar-LB") {
            // User is speaking English — restart with en-US
            currentLangRef.current = "en-US";
            rec.stop(); // onend will restart with en-US
            return;
          }
        }
      }

      // Show: all finalized text + the current interim word (real-time feedback)
      const lastResult = event.results[event.results.length - 1];
      const interim = !lastResult.isFinal ? lastResult[0].transcript : "";
      const display = [transcriptRef.current, interim].filter(Boolean).join(" ");
      if (onResultRef.current) onResultRef.current(display.trim());
    };

    rec.onend = () => {
      if (activeRef.current && continuous) {
        // Browser cut us off (silence timeout, network blip, etc.) — restart seamlessly
        setTimeout(() => launchRef.current?.(currentLangRef.current), 100);
      } else {
        setListening(false);
        // Fire one final callback with the complete transcript
        if (continuous && transcriptRef.current && onResultRef.current) {
          onResultRef.current(transcriptRef.current);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === "aborted") return; // we stopped it intentionally
      if (activeRef.current && continuous) {
        // Recoverable errors — restart after a small delay
        setTimeout(() => launchRef.current?.(currentLangRef.current), 300);
        return;
      }
      activeRef.current = false;
      setListening(false);
    };

    rec.start();
    recognitionRef.current = rec;
  }, [supported, continuous, lang]);

  // Keep ref current so onend closures always call the latest version
  launchRef.current = launch;

  const startListening = useCallback(() => {
    if (!supported || activeRef.current) return;
    transcriptRef.current  = "";
    currentLangRef.current = lang === "auto" ? "ar-LB" : lang;
    langLockedRef.current  = false;
    activeRef.current      = true;
    launch(currentLangRef.current);
  }, [supported, lang, launch]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return { listening, startListening, stopListening, toggle, supported };
}
