import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

/**
 * Invisible component that listens for hardware barcode scanner input.
 * Scanners fire keydown events rapidly then emit Enter.
 */
export default function BarcodeScanner({ barcodeMap, onScan }) {
  const bufferRef   = useRef("");
  const lastTimeRef = useRef(0);

  // Keep window focused so scanner keystrokes always land
  useEffect(() => {
    const refocus = () => {
      if (document.activeElement?.tagName === "BODY") return;
      // If nothing interactive is focused, make sure window has focus
      window.focus();
    };
    // Recapture focus whenever the page becomes visible (e.g. alt-tab back)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) window.focus();
    });
    return () => document.removeEventListener("visibilitychange", refocus);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Let the search input handle its own Enter
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const now = Date.now();

      // Reset buffer if gap > 100ms — human keystroke, not scanner burst
      if (now - lastTimeRef.current > 100) bufferRef.current = "";
      lastTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (!code) return;

        const product = barcodeMap[code];
        if (product) {
          onScan(product);
        } else {
          toast.error(`Barcode not found: ${code}`);
        }
        return;
      }

      // Accumulate — include all chars scanners can produce
      if (/^[0-9a-zA-Z\-_\.\+\/]$/.test(e.key)) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeMap, onScan]);

  return null;
}