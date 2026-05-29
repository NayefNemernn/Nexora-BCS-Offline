import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, Check, X, SwitchCamera, Loader2, ImageOff } from "lucide-react";
import { removeBackground } from "@imgly/background-removal";

// Checkerboard style used to visualise transparency in the preview
const checkerboard = {
  background: `
    repeating-conic-gradient(
      #d1d5db 0% 25%,
      #f9fafb 0% 50%
    ) 0 0 / 20px 20px
  `,
};

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [step,         setStep]         = useState("camera"); // "camera"|"processing"|"preview"
  const [processedBlob, setProcessedBlob] = useState(null);
  const [processedUrl,  setProcessedUrl]  = useState(null);
  const [progress,      setProgress]      = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [cameraFacing,  setCameraFacing]  = useState("environment"); // back cam first
  const [cameraError,   setCameraError]   = useState(null);
  const [bgFailed,      setBgFailed]      = useState(false); // bg removal fell back

  // ── Camera helpers ────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing) => {
    stopStream();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access denied or not available on this device.");
    }
  }, [stopStream]);

  useEffect(() => {
    startCamera(cameraFacing);
    return () => {
      stopStream();
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    };
  }, []); // eslint-disable-line

  const switchCamera = () => {
    const next = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(next);
    startCamera(next);
  };

  // ── Capture + background removal ──────────────────────────────────────────
  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    stopStream(); // release camera

    canvas.toBlob(async (rawBlob) => {
      setStep("processing");
      setProgress(0);
      setProgressLabel("Loading AI model…");
      setBgFailed(false);

      try {
        const resultBlob = await removeBackground(rawBlob, {
          model: "small",
          output: { format: "image/png", quality: 1 },
          progress: (key, current, total) => {
            if (total > 0) {
              setProgress(Math.round((current / total) * 100));
              if (key.includes("fetch")) setProgressLabel("Downloading model…");
              else if (key.includes("infer")) setProgressLabel("Removing background…");
              else setProgressLabel("Processing…");
            }
          },
        });

        const url = URL.createObjectURL(resultBlob);
        setProcessedBlob(resultBlob);
        setProcessedUrl(url);
        setStep("preview");
      } catch (err) {
        console.error("[CameraCapture] background removal failed:", err);
        // Fallback: use the raw captured image without bg removal
        const url = URL.createObjectURL(rawBlob);
        setProcessedBlob(rawBlob);
        setProcessedUrl(url);
        setBgFailed(true);
        setStep("preview");
      }
    }, "image/jpeg", 0.95);
  };

  const retake = () => {
    if (processedUrl) URL.revokeObjectURL(processedUrl);
    setProcessedBlob(null);
    setProcessedUrl(null);
    setProgress(0);
    setProgressLabel("");
    setBgFailed(false);
    setStep("camera");
    startCamera(cameraFacing);
  };

  const useImage = () => {
    if (processedBlob && processedUrl) {
      onCapture(processedBlob, processedUrl);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#161616] rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-blue-500"/>
            <h3 className="font-semibold text-sm">
              {step === "camera"     && "Capture Product Photo"}
              {step === "processing" && "Removing Background…"}
              {step === "preview"    && (bgFailed ? "Captured Image" : "Background Removed")}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition"
          >
            <X size={15}/>
          </button>
        </div>

        {/* ── Camera view ── */}
        {step === "camera" && (
          <div className="relative bg-black" style={{ height: 380 }}>
            {cameraError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
                  <Camera size={24} className="text-gray-500"/>
                </div>
                <p className="text-sm text-gray-400">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover"
                />

                {/* Framing guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-56 h-56">
                    {/* Corner marks */}
                    {[
                      "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                      "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                      "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                      "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-6 h-6 border-white ${cls}`}/>
                    ))}
                  </div>
                </div>

                {/* Tip */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                  <p className="text-xs text-white/80 whitespace-nowrap">Center the product in the frame</p>
                </div>

                {/* Switch camera */}
                <button
                  onClick={switchCamera}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-xl bg-black/50 hover:bg-black/70 text-white transition"
                  title="Switch camera"
                >
                  <SwitchCamera size={16}/>
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Processing ── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-5 py-16 px-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-800"/>
                <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                  className="text-blue-500 transition-all duration-300"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold tabular-nums">{progress}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm text-gray-800 dark:text-white">AI Background Removal</p>
              <p className="text-xs text-gray-500 mt-1">{progressLabel || "Initializing…"}</p>
              <p className="text-[10px] text-gray-400 mt-2">First run downloads the model (~10 MB) — subsequent runs are instant</p>
            </div>
          </div>
        )}

        {/* ── Preview ── */}
        {step === "preview" && (
          <div className="p-5 space-y-3">
            {bgFailed && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30">
                <ImageOff size={13} className="text-amber-500 shrink-0"/>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Background removal failed — using original image. You can still use it or retake.
                </p>
              </div>
            )}

            {/* Preview with checkerboard to show transparency */}
            <div
              className="rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ height: 300, ...checkerboard }}
            >
              {processedUrl && (
                <img
                  src={processedUrl}
                  alt="Product preview"
                  className="max-h-72 max-w-full object-contain drop-shadow-xl"
                />
              )}
            </div>

            {!bgFailed && (
              <p className="text-[11px] text-center text-gray-400">
                Background removed — transparent areas shown as checkerboard
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 shrink-0">
          {step === "camera" && !cameraError && (
            <button
              onClick={capture}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white
                bg-blue-600 hover:bg-blue-700
                shadow-[0_4px_14px_rgba(59,130,246,0.4)]
                flex items-center justify-center gap-2 transition"
            >
              <Camera size={15}/> Capture
            </button>
          )}

          {step === "preview" && (
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold
                  bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20
                  flex items-center justify-center gap-2 transition"
              >
                <RefreshCw size={13}/> Retake
              </button>
              <button
                onClick={useImage}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                  bg-green-600 hover:bg-green-700
                  shadow-[0_4px_14px_rgba(34,197,94,0.4)]
                  flex items-center justify-center gap-2 transition"
              >
                <Check size={14}/> Use This
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
