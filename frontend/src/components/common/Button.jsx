import React from "react";
import { Mic, MicOff } from "lucide-react";
import { useVoiceInput } from "../../hooks/useVoiceInput";

/**
 * VoiceButton
 *
 * Props:
 *   onResult(text)   — called with the recognised transcript
 *   lang             — BCP-47 code, default "ar-LB"
 *   size             — "sm" | "md" (default "md")
 *   color            — tailwind active color key: "blue"|"green"|"purple"|"red" (default "blue")
 *   className        — extra classes
 */
const COLORS = {
  blue:   { idle: "bg-blue-100 dark:bg-blue-900/30 text-blue-500 hover:bg-blue-200 dark:hover:bg-blue-900/50",   active: "bg-blue-600 text-white shadow-[0_0_14px_rgba(59,130,246,0.6)]"   },
  green:  { idle: "bg-green-100 dark:bg-green-900/30 text-green-500 hover:bg-green-200",                          active: "bg-green-600 text-white shadow-[0_0_14px_rgba(34,197,94,0.6)]"  },
  purple: { idle: "bg-purple-100 dark:bg-purple-900/30 text-purple-500 hover:bg-purple-200",                      active: "bg-purple-600 text-white shadow-[0_0_14px_rgba(147,51,234,0.6)]" },
  red:    { idle: "bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200",                                  active: "bg-red-600 text-white shadow-[0_0_14px_rgba(239,68,68,0.6)]"   },
};

export default function VoiceButton({
  onResult,
  lang      = "ar-LB",
  size      = "md",
  color     = "blue",
  className = "",
}) {
  const { listening, toggle, supported } = useVoiceInput(onResult, lang);

  if (!supported) return null;

  const scheme = COLORS[color] || COLORS.blue;
  const dim    = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSz = size === "sm" ? 13 : 16;

  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={toggle}
      title={listening ? "Stop listening" : "Tap to speak"}
      className={`
        flex-shrink-0 flex items-center justify-center rounded-xl
        transition-all duration-200
        ${dim}
        ${listening ? scheme.active + " animate-pulse" : scheme.idle}
        ${className}
      `}
    >
      {listening ? <MicOff size={iconSz} /> : <Mic size={iconSz} />}
    </button>
  );
}