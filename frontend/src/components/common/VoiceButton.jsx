import React from "react";
import { Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "../../hooks/useVoiceInput";

/**
 * VoiceButton — attach to any input.
 *
 * Props:
 *   onResult(text)  — called when speech is recognised
 *   lang            — BCP-47 language code (default "ar-LB")
 *   className       — extra classes for the button
 */
export default function VoiceButton({ onResult, lang = "auto", className = "", continuous = false }) {
  const { listening, toggle, supported } = useVoiceInput(onResult, lang, continuous);

  if (!supported) return null;

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // don't blur the input
      onClick={toggle}
      title={listening ? "Stop listening" : "Speak to fill"}
      className={`
        flex items-center justify-center
        w-9 h-9 rounded-xl
        transition-all duration-200
        ${listening
          ? "bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]"
          : "bg-gray-200 dark:bg-[#1c1c1c] text-gray-500 dark:text-gray-400 hover:text-blue-500"
        }
        ${className}
      `}
    >
      {listening ? <MicOff size={15} /> : <Mic size={15} />}
    </button>
  );
}