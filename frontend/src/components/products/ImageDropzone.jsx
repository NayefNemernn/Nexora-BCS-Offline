import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Crop, Loader2, Camera } from "lucide-react";
import imageCompression from "browser-image-compression";
import ImageCropModal from "./ImageCropModal";
import CameraCapture from "./CameraCapture";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 800,
  useWebWorker: true,
};

export default function ImageDropzone({ preview, setPreview, setImage }) {
  const [cropSrc,     setCropSrc]     = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [showCamera,  setShowCamera]  = useState(false);

  // ── Shared: compress + set ────────────────────────────────────────────────
  const compressAndSet = async (blob, mimeType = "image/jpeg") => {
    setCompressing(true);
    try {
      const ext  = mimeType === "image/png" ? "png" : "jpg";
      const file = new File([blob], `product.${ext}`, { type: mimeType });
      // PNG files (with transparency from camera bg-removal) skip JPEG compression
      // so transparency is preserved; only JPEG inputs get compressed
      if (mimeType === "image/png") {
        setImage(file);
        setPreview(URL.createObjectURL(file));
      } else {
        const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
        setImage(compressed);
        setPreview(URL.createObjectURL(compressed));
      }
    } catch {
      setImage(blob);
      setPreview(URL.createObjectURL(blob));
    } finally {
      setCompressing(false);
    }
  };

  // ── File upload / drop → crop modal ──────────────────────────────────────
  const handleCropDone = async (blob, croppedUrl) => {
    setCropSrc(null);
    await compressAndSet(blob, "image/jpeg");
  };

  const onDrop = useCallback((files) => {
    const file = files[0];
    if (file) setCropSrc(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [] },
  });

  // ── Camera capture → direct use (already cropped by framing) ─────────────
  const handleCameraCapture = async (blob, _url) => {
    setShowCamera(false);
    // Camera images are PNG (with transparent bg after removal) — skip crop
    await compressAndSet(blob, blob.type || "image/png");
  };

  return (
    <>
      {/* ── Drop zone ── */}
      <div className="flex gap-2">
        <div
          {...getRootProps()}
          className={`
            flex-1 h-20 flex items-center justify-center rounded-xl
            text-gray-500 cursor-pointer transition
            bg-gray-100 dark:bg-[#141414]
            shadow-[inset_5px_5px_10px_#d1d5db,inset_-5px_-5px_10px_#ffffff]
            dark:shadow-[inset_5px_5px_10px_#050505,inset_-5px_-5px_10px_#1f1f1f]
            ${isDragActive ? "ring-2 ring-blue-400 dark:ring-blue-500" : ""}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-1">
            {compressing ? (
              <>
                <Loader2 size={22} className="text-blue-400 animate-spin"/>
                <p className="text-xs text-blue-500">Processing…</p>
              </>
            ) : (
              <>
                <UploadCloud size={22} className="text-gray-400"/>
                <p className="text-sm text-center px-2">
                  {isDragActive ? "Drop the image here…" : "Drag & drop or click to upload"}
                </p>
                {preview && (
                  <p className="text-[11px] text-blue-500 flex items-center gap-1">
                    <Crop size={10}/> Crop & compress on upload
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Camera button ── */}
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          title="Capture from camera (background auto-removed)"
          className="
            w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-xl shrink-0
            text-gray-500 cursor-pointer transition
            bg-gray-100 dark:bg-[#141414]
            shadow-[inset_5px_5px_10px_#d1d5db,inset_-5px_-5px_10px_#ffffff]
            dark:shadow-[inset_5px_5px_10px_#050505,inset_-5px_-5px_10px_#1f1f1f]
            hover:text-blue-500 dark:hover:text-blue-400
          "
        >
          <Camera size={22}/>
          <span className="text-[10px] font-medium leading-tight text-center">Camera</span>
        </button>
      </div>

      {/* Crop modal (for file uploads) */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onDone={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Camera capture modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
