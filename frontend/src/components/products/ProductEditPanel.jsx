import { isOnline } from "../../lib/connectivity";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Printer, Tag, Package, TrendingUp, Save, RefreshCw, DollarSign, ShoppingCart, Calendar, Layers, Trash2, Loader2, Camera, Globe, Calculator } from "lucide-react";
import VoiceButton from "../common/VoiceButton";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";
import imageCompression from "browser-image-compression";
import { useEffect, useRef, useState, useCallback } from "react";
import { useProductsTranslation } from "../../hooks/useProductsTranslation";
import { useCurrency } from "../../context/CurrencyContext";
import { getProductStats } from "../../api/product.api";
import ImageCropModal from "./ImageCropModal";
import CameraCapture from "./CameraCapture";

const BARCODE_FORMATS = ["CODE128", "CODE39", "EAN13", "UPCA"];
const COMPRESSION_OPTIONS = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };

export default function ProductEditPanel({
  editingProduct,
  setEditingProduct,
  setProducts,
  updateProduct,
  editImage,
  setEditImage,
  editPreview,
  setEditPreview,
  categories = [],
}) {
  const t                              = useProductsTranslation();
  const { exchangeRate, formatLBP }   = useCurrency();
  const barcodeRef                    = useRef(null);
  const expiryPickerRef               = useRef(null);

  const [saving,             setSaving]             = useState(false);
  const [stats,              setStats]              = useState(null);
  const [loadingStats,       setLoadingStats]       = useState(false);
  const [barcodeFormat,      setBarcodeFormat]      = useState("CODE128");
  const [cropSrc,            setCropSrc]            = useState(null);
  const [compressing,        setCompressing]        = useState(false);
  const [showCamera,         setShowCamera]         = useState(false);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  // Shared currency mode for BOTH price and cost fields
  const [fieldCurrency, setFieldCurrency] = useState("usd"); // "usd" | "lbp"
  const [priceRaw,      setPriceRaw]      = useState("");
  const [costRaw,       setCostRaw]       = useState("");

  // ── Expiry date display (dd/mm/yyyy) ─────────────────────────────────────
  const [expiryDisplay, setExpiryDisplay] = useState("");

  const isoToDisplay = (iso) => {
    if (!iso) return "";
    const d = iso.slice(0, 10).split("-");
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : "";
  };

  const handleExpiryInput = (raw) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let display = digits;
    if (digits.length > 2) display = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
    setExpiryDisplay(display);
    if (digits.length === 8) {
      const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
      setEditingProduct(p => ({ ...p, expiryDate: iso }));
    } else if (digits.length === 0) {
      setEditingProduct(p => ({ ...p, expiryDate: null }));
    }
  };

  // ── Box unit-cost calculator ─────────────────────────────────────────────
  const [showCalc, setShowCalc] = useState(false);
  const [boxCost,  setBoxCost]  = useState("");
  const [boxUnits, setBoxUnits] = useState("");

  const calcUnitCost = () => {
    const c = parseFloat(boxCost);
    const u = parseFloat(boxUnits);
    if (!c || !u || u <= 0) return null;
    // Result is in the active display currency (same units the user typed)
    return fieldCurrency === "lbp"
      ? Math.round(c / u)
      : +(c / u).toFixed(2);
  };

  const applyCalcCost = () => {
    const unit = calcUnitCost();
    if (!unit) return;
    // Pass display-currency value directly — handleCostChange converts to USD
    handleCostChange(unit.toString());
    setShowCalc(false);
    setBoxCost(""); setBoxUnits("");
  };

  // Format USD for display: max 2 decimal places, strip trailing zeros (1.50 → "1.5", 0.34 → "0.34")
  const cleanUSD = (n) => parseFloat(parseFloat(n).toFixed(2)).toString();

  // Init both raw inputs when a different product is opened
  useEffect(() => {
    if (editingProduct?._id) {
      setFieldCurrency("usd");
      setPriceRaw(editingProduct.price ? cleanUSD(editingProduct.price) : "");
      setCostRaw(editingProduct.cost  ? cleanUSD(editingProduct.cost)  : "");
      setRemoveExistingImage(false);
      setExpiryDisplay(isoToDisplay(editingProduct.expiryDate?.slice(0, 10) || ""));
    }
  }, [editingProduct?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch both fields together
  const switchFieldCurrency = (to) => {
    if (to === fieldCurrency) return;
    const p = parseFloat(priceRaw);
    const c = parseFloat(costRaw);
    if (to === "lbp") {
      if (!isNaN(p) && p > 0) setPriceRaw(Math.round((p * exchangeRate) / 1000).toString());
      if (!isNaN(c) && c > 0) setCostRaw(Math.round((c * exchangeRate) / 1000).toString());
    } else {
      if (!isNaN(p) && p > 0) setPriceRaw(cleanUSD((p * 1000) / exchangeRate));
      if (!isNaN(c) && c > 0) setCostRaw(cleanUSD((c * 1000) / exchangeRate));
    }
    setFieldCurrency(to);
  };

  const handlePriceChange = (raw) => {
    setPriceRaw(raw);
    const num = parseFloat(raw);
    const usd = isNaN(num) || raw === "" ? 0 : fieldCurrency === "lbp" ? (num * 1000) / exchangeRate : num;
    setEditingProduct(p => ({ ...p, price: usd }));
  };

  const handleCostChange = (raw) => {
    setCostRaw(raw);
    const num = parseFloat(raw);
    const usd = isNaN(num) || raw === "" ? 0 : fieldCurrency === "lbp" ? (num * 1000) / exchangeRate : num;
    setEditingProduct(p => ({ ...p, cost: usd }));
  };

  /* Load stats when product changes */
  useEffect(() => {
    if (!editingProduct?._id) return;
    setStats(null);
    setLoadingStats(true);
    getProductStats(editingProduct._id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [editingProduct?._id]);

  /* Render barcode SVG */
  useEffect(() => {
    if (!editingProduct?.barcode || !barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, String(editingProduct.barcode), {
        format: barcodeFormat, width: 2, height: 50,
        displayValue: true, fontSize: 12, margin: 6,
        background: "transparent", lineColor: "#111111",
      });
    } catch {}
  }, [editingProduct?.barcode, barcodeFormat]);

  /* Print label */
  const printLabel = () => {
    if (!editingProduct?.barcode) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.appendChild(svg);
    try {
      JsBarcode(svg, String(editingProduct.barcode), {
        format: barcodeFormat, width: 3, height: 80,
        displayValue: true, fontSize: 14, margin: 10,
        background: "#ffffff", lineColor: "#000000",
      });
    } catch {
      document.body.removeChild(svg);
      toast.error(`${t.cannotPrint} ${barcodeFormat}`);
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    document.body.removeChild(svg);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 3;
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(svgUrl);
      const win = window.open("", "_blank");
      win.document.write(`<!DOCTYPE html><html><head><title>Label — ${editingProduct.barcode}</title>
        <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:100%}@media print{@page{margin:10mm}body{min-height:unset}}</style>
        </head><body><img src="${canvas.toDataURL("image/png")}"/>
        <script>window.onload=()=>window.print();<\/script></body></html>`);
      win.document.close();
    };
    img.src = svgUrl;
  };

  /* Image crop + compress */
  const handleImageFile = useCallback((file) => {
    setCropSrc(URL.createObjectURL(file));
  }, []);

  const handleCropDone = async (blob, croppedUrl) => {
    setCropSrc(null);
    setCompressing(true);
    try {
      const file       = new File([blob], "product.jpg", { type: "image/jpeg" });
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      setEditImage(compressed);
      setEditPreview(URL.createObjectURL(compressed));
    } catch {
      setEditImage(blob);
      setEditPreview(croppedUrl);
    } finally {
      setCompressing(false);
    }
  };

  // Camera capture → bg already removed → use PNG directly (preserve transparency)
  const handleCameraCapture = useCallback(async (blob) => {
    setShowCamera(false);
    setCompressing(true);
    try {
      const file = new File([blob], "product.png", { type: "image/png" });
      setEditImage(file);
      setEditPreview(URL.createObjectURL(file));
    } finally {
      setCompressing(false);
    }
  }, [setEditImage, setEditPreview]);

  /* Variant helpers */
  const addVariant = () => {
    setEditingProduct(prev => ({
      ...prev,
      hasVariants: true,
      variants: [...(prev.variants || []), { name: "", price: null, stock: 0, barcode: "" }],
    }));
  };

  const removeVariant = (idx) => {
    const variants = (editingProduct.variants || []).filter((_, i) => i !== idx);
    setEditingProduct({ ...editingProduct, variants, hasVariants: variants.length > 0 });
  };

  const updateVariant = (idx, field, raw) => {
    const variants = (editingProduct.variants || []).map((v, i) => {
      if (i !== idx) return v;
      const value = (field === "price")
        ? (raw === "" ? null : Number(raw))
        : (field === "stock")
          ? (Number(raw) || 0)
          : raw;
      return { ...v, [field]: value };
    });
    setEditingProduct({ ...editingProduct, variants });
  };

  /* Save */
  const handleSave = async () => {
    if (!editingProduct.name) { toast.error(t.nameRequired2); return; }
    setSaving(true);

    /* ── Offline: queue as mutation (image changes require connection) ── */
    if (!isOnline()) {
      if (editImage) {
        toast.error("❌ Image changes require a connection — remove the image to save offline");
        setSaving(false);
        return;
      }
      const { queueMutation, cacheProducts, getCachedProducts } = await import("../../lib/offlineDB");
      const offlinePayload = {
        name:               editingProduct.name,
        price:              editingProduct.price,
        cost:               editingProduct.cost || 0,
        stock:              editingProduct.stock,
        barcode:            editingProduct.barcode,
        category:           editingProduct.category?._id || editingProduct.category || "",
        hasVariants:        !!editingProduct.hasVariants,
        isAvailableOnline:  !!editingProduct.isAvailableOnline,
        vatExempt:          !!editingProduct.vatExempt,
        expiryDate:         editingProduct.expiryDate || null,
        expiryAlertDays:    Number(editingProduct.expiryAlertDays) || 180,
        variants:           editingProduct.variants || [],
        removeImage:        removeExistingImage && !editImage,
      };
      await queueMutation("update_product", `/api/products/${editingProduct._id}`, "PUT", offlinePayload);
      const updated = { ...editingProduct, ...offlinePayload };
      setProducts(prev => prev.map(p => p._id === editingProduct._id ? updated : p));
      const cachedList = await getCachedProducts();
      if (cachedList) await cacheProducts(cachedList.map(p => p._id === editingProduct._id ? { ...p, ...offlinePayload } : p));
      setEditingProduct(null);
      toast.success("📴 Changes saved — will sync when connected");
      setSaving(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("name",     editingProduct.name);
      data.append("price",    String(editingProduct.price));
      data.append("cost",     String(editingProduct.cost || 0));
      data.append("stock",    String(editingProduct.stock));
      data.append("barcode",  editingProduct.barcode);
      data.append("category", editingProduct.category?._id || editingProduct.category || "");
      data.append("hasVariants",        String(!!editingProduct.hasVariants));
      data.append("isAvailableOnline",  String(!!editingProduct.isAvailableOnline));
      data.append("vatExempt",          String(!!editingProduct.vatExempt));
      if (editingProduct.variants?.length) {
        data.append("variants", JSON.stringify(
          editingProduct.variants.map(v => ({
            ...(v._id ? { _id: v._id } : {}),
            name:    v.name,
            price:   v.price !== "" ? v.price : null,
            stock:   Number(v.stock) || 0,
            barcode: v.barcode || "",
          }))
        ));
      }
      if (editingProduct.expiryDate) data.append("expiryDate", editingProduct.expiryDate);
      data.append("expiryAlertDays", String(Number(editingProduct.expiryAlertDays) || 180));
      if (removeExistingImage && !editImage) data.append("removeImage", "true");
      if (editImage) data.append("image", editImage);

      const updated = await updateProduct(editingProduct._id, data);
      setProducts(prev => prev.map(p => p._id === updated._id ? updated : p));
      setEditingProduct(null);
      setEditImage(null);
      toast.success(t.productUpdated);
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedToUpdate);
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full px-3 py-2.5 rounded-xl outline-none text-sm transition " +
    "bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 " +
    "focus:border-blue-400 dark:focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15";

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex-1 rounded-xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/8 p-3">
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon size={12}/>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );

  return (
    <AnimatePresence>
      {editingProduct && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingProduct(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-full
              bg-white dark:bg-[#161616]
              border-l border-gray-200 dark:border-white/10
              shadow-[-20px_0_60px_rgba(0,0,0,0.15)]
              flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/8 shrink-0">
              <div className="flex items-center gap-3">
                {(editPreview || editingProduct.image) ? (
                  <img
                    src={editPreview || editingProduct.image}
                    className="w-9 h-9 rounded-xl object-cover border border-gray-200 dark:border-white/10"
                    onError={e => e.target.src = "/placeholder.png"}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Package size={16} className="text-blue-600 dark:text-blue-400"/>
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-sm">{t.editProduct}</h2>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">{editingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition"
              >
                <X size={15}/>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* ── Image dropzone with crop+compress + camera capture ── */}
              <div className="flex gap-2">
              <div
                className="relative flex-1 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 dark:border-white/10 cursor-pointer group"
                style={{ height: 120 }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImageFile(file);
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = "image/*";
                  input.onchange = e => {
                    const file = e.target.files[0];
                    if (file) handleImageFile(file);
                  };
                  input.click();
                }}
              >
                {compressing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-blue-500">
                    <Loader2 size={24} className="animate-spin"/>
                    <p className="text-xs">{t.compressing}</p>
                  </div>
                ) : (editPreview || editingProduct.image) ? (
                  <img
                    src={editPreview || editingProduct.image}
                    className="w-full h-full object-cover"
                    onError={e => e.target.src = "/placeholder.png"}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-1.5">
                    <Package size={24}/>
                    <p className="text-xs">{t.clickOrDragImage}</p>
                  </div>
                )}
                {!compressing && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <p className="text-white text-xs font-medium">{t.cropReplaceImage}</p>
                  </div>
                )}
                {/* Delete photo button */}
                {!compressing && (editPreview || editingProduct.image) && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setEditPreview(null);
                      setEditImage(null);
                      setEditingProduct(p => ({ ...p, image: "" }));
                      setRemoveExistingImage(true);
                    }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-lg
                      bg-red-500 hover:bg-red-600 text-white shadow-lg transition"
                    title="Remove photo"
                  >
                    <Trash2 size={13}/>
                  </button>
                )}
              </div>

              {/* Camera button */}
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                title="Capture from camera (background auto-removed)"
                className="w-16 rounded-xl flex flex-col items-center justify-center gap-1 shrink-0
                  border-2 border-dashed border-gray-200 dark:border-white/10
                  text-gray-400 hover:text-blue-500 dark:hover:text-blue-400
                  hover:border-blue-300 dark:hover:border-blue-500/50
                  transition"
                style={{ height: 120 }}
              >
                <Camera size={20}/>
                <span className="text-[10px] font-medium leading-tight text-center px-1">Camera</span>
              </button>
              </div>{/* end flex gap-2 */}

              {/* ── Name ── */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.productName}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className={inp + " flex-1"}
                  />
                  <VoiceButton onResult={text => setEditingProduct({ ...editingProduct, name: text })} color="blue"/>
                </div>
              </div>

              {/* ── Category ── */}
              {categories.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Category</label>
                  <select
                    value={editingProduct.category?._id || editingProduct.category || ""}
                    onChange={e => {
                      const cat = categories.find(c => c._id === e.target.value) || null;
                      setEditingProduct(p => ({ ...p, category: cat }));
                    }}
                    className={inp + " mt-1"}
                  >
                    <option value="">— No category —</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* ── Price + Cost (shared currency toggle) ── */}
              <div className="space-y-3">

                {/* Currency toggle — one toggle controls both fields */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  {[["usd", "$ USD"], ["lbp", "ل.ل LBP"]].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => switchFieldCurrency(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        fieldCurrency === val
                          ? val === "usd"
                            ? "bg-green-500 text-white shadow-[0_2px_8px_rgba(34,197,94,0.4)]"
                            : "bg-amber-500 text-white shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >{label}</button>
                  ))}
                </div>

                {/* Price */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.price}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="relative flex-1">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${fieldCurrency === "lbp" ? "text-amber-500" : "text-green-500"}`}>
                        {fieldCurrency === "lbp" ? "ل" : "$"}
                      </span>
                      <input type="number" min="0" step={fieldCurrency === "lbp" ? "1" : "0.0001"}
                        value={priceRaw}
                        onChange={e => handlePriceChange(e.target.value)}
                        className={inp + " pl-6" + (fieldCurrency === "lbp" ? " pr-12" : "")}/>
                      {fieldCurrency === "lbp" && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs pointer-events-none select-none">,000</span>
                      )}
                    </div>
                    <VoiceButton onResult={text => { const n = text.replace(/[^0-9.]/g,""); if(n) handlePriceChange(n); }} color="green"/>
                  </div>
                  {fieldCurrency === "lbp" && priceRaw && parseFloat(priceRaw) > 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      = {(parseFloat(priceRaw) * 1000).toLocaleString("en-US")} ل.ل
                    </p>
                  )}
                </div>

                {/* Cost */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.cost || "Cost"}</label>
                    <button
                      type="button"
                      onClick={() => setShowCalc(v => !v)}
                      title="Box / unit calculator"
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition
                        ${showCalc
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-white/10 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                    >
                      <Calculator size={10}/> Calc
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${fieldCurrency === "lbp" ? "text-amber-500" : "text-green-500"}`}>
                        {fieldCurrency === "lbp" ? "ل" : "$"}
                      </span>
                      <input type="number" min="0" step={fieldCurrency === "lbp" ? "1" : "0.0001"}
                        placeholder="0"
                        value={costRaw}
                        onChange={e => handleCostChange(e.target.value)}
                        className={inp + " pl-6" + (fieldCurrency === "lbp" ? " pr-12" : "")}/>
                      {fieldCurrency === "lbp" && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs pointer-events-none select-none">,000</span>
                      )}
                    </div>
                    <VoiceButton onResult={text => { const n = text.replace(/[^0-9.]/g,""); if(n) handleCostChange(n); }} color="green"/>
                  </div>
                  {fieldCurrency === "lbp" && costRaw && parseFloat(costRaw) > 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">
                      = {(parseFloat(costRaw) * 1000).toLocaleString("en-US")} ل.ل
                    </p>
                  )}

                  {/* ── Box calculator ── */}
                  {showCalc && (
                    <div className="mt-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 space-y-2">
                      <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Box Calculator</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-500 mb-1">
                            Box total cost ({fieldCurrency === "lbp" ? "ل.ل ,000" : "$"})
                          </p>
                          <div className="relative">
                            <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none ${fieldCurrency === "lbp" ? "text-amber-500" : "text-green-500"}`}>
                              {fieldCurrency === "lbp" ? "ل" : "$"}
                            </span>
                            <input
                              type="number" min="0" step={fieldCurrency === "lbp" ? "1" : "0.01"}
                              placeholder={fieldCurrency === "lbp" ? "18" : "18.00"}
                              value={boxCost}
                              onChange={e => setBoxCost(e.target.value)}
                              className={`w-full pl-6 py-1.5 rounded-lg text-xs bg-white dark:bg-[#1c1c1c] border border-blue-200 dark:border-blue-500/30 outline-none focus:border-blue-400 transition${fieldCurrency === "lbp" ? " pr-8" : ""}`}
                            />
                            {fieldCurrency === "lbp" && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-[10px] pointer-events-none">,000</span>
                            )}
                          </div>
                        </div>
                        <span className="text-gray-400 font-bold text-base pt-4">÷</span>
                        <div className="flex-1">
                          <p className="text-[10px] text-gray-500 mb-1">Units per box</p>
                          <input
                            type="number" min="1" step="1" placeholder="24"
                            value={boxUnits}
                            onChange={e => setBoxUnits(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-[#1c1c1c] border border-blue-200 dark:border-blue-500/30 outline-none focus:border-blue-400 transition"
                          />
                        </div>
                      </div>
                      {calcUnitCost() !== null && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                            {fieldCurrency === "lbp"
                              ? `= ${calcUnitCost().toLocaleString()},000 ل.ل / unit`
                              : `= $${calcUnitCost()} / unit`
                            }
                          </span>
                          <button
                            type="button"
                            onClick={applyCalcCost}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Margin + currency converter ── */}
              {editingProduct.price > 0 && (() => {
                const priceUSD = editingProduct.price;
                const costUSD  = editingProduct.cost || 0;
                const profit   = priceUSD - costUSD;
                const margin   = priceUSD > 0 ? (profit / priceUSD) * 100 : 0;
                const color    = margin >= 20 ? "text-green-600 dark:text-green-400" : margin >= 5 ? "text-amber-500" : "text-red-500";
                return (
                  <div className="rounded-xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/8 overflow-hidden">
                    {costUSD > 0 && (
                      <div className={`flex justify-between text-xs px-3 py-2 border-b border-gray-100 dark:border-white/5 ${color}`}>
                        <span>{t.margin} <b>{margin.toFixed(1)}%</b></span>
                        <span>{t.profitUnit} <b>${cleanUSD(profit)}</b></span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-white/5">
                      {[
                        { label: "Price",  usd: priceUSD, lbp: priceUSD * exchangeRate },
                        { label: "Cost",   usd: costUSD,  lbp: costUSD  * exchangeRate },
                        { label: "Profit", usd: profit,   lbp: profit   * exchangeRate, colored: true },
                      ].map(({ label, usd, lbp, colored }) => (
                        <div key={label} className="px-2.5 py-2">
                          <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                          <p className={`text-[11px] font-semibold ${colored ? color : "text-gray-700 dark:text-gray-300"}`}>
                            ${cleanUSD(usd)}
                          </p>
                          <p className={`text-[10px] ${colored ? color : "text-amber-500"} opacity-90`}>
                            {formatLBP(lbp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── Stock ── */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.stock}</label>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => setEditingProduct({ ...editingProduct, stock: Math.max(0, editingProduct.stock - 1) })}
                    className="w-9 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/15 transition">
                    <Minus size={13}/>
                  </button>
                  <input type="number" min="0" value={editingProduct.stock}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className={inp + " text-center"}/>
                  <VoiceButton onResult={text => { const n = text.replace(/[^0-9]/g,""); if(n) setEditingProduct({ ...editingProduct, stock: Number(n) }); }} color="green"/>
                  <button onClick={() => setEditingProduct({ ...editingProduct, stock: editingProduct.stock + 1 })}
                    className="w-9 h-10 shrink-0 rounded-xl bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/15 transition">
                    <Plus size={13}/>
                  </button>
                </div>
              </div>

              {/* ── Expiry date ── */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11}/> {t.expiryDate} <span className="normal-case text-gray-300 dark:text-gray-600 font-normal">{t.optional}</span>
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/yyyy"
                    value={expiryDisplay}
                    onChange={e => handleExpiryInput(e.target.value)}
                    maxLength={10}
                    className={inp + " pr-9"}/>
                  <button
                    type="button"
                    onClick={() => expiryPickerRef.current?.showPicker?.()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition"
                  >
                    <Calendar size={15}/>
                  </button>
                  <input
                    type="date"
                    ref={expiryPickerRef}
                    tabIndex={-1}
                    value={editingProduct.expiryDate ? editingProduct.expiryDate.slice(0, 10) : ""}
                    onChange={e => {
                      const iso = e.target.value;
                      if (iso) {
                        const d = iso.split("-");
                        setExpiryDisplay(`${d[2]}/${d[1]}/${d[0]}`);
                        setEditingProduct(p => ({ ...p, expiryDate: iso }));
                      } else {
                        setExpiryDisplay("");
                        setEditingProduct(p => ({ ...p, expiryDate: null }));
                      }
                    }}
                    className="absolute inset-0 opacity-0 pointer-events-none w-0"/>
                </div>
                {editingProduct.expiryDate && (() => {
                  const days = Math.ceil((new Date(editingProduct.expiryDate) - new Date()) / 86400000);
                  const color = days < 0 ? "text-red-500" : days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-green-500";
                  const msg   = days < 0 ? t.expired || "Expired!" : days === 0 ? t.expiresToday || "Expires today!" : `${t.expiresIn || "Expires in"} ${days} ${t.days || "days"}`;
                  return <p className={`text-xs mt-1 font-medium ${color}`}>{msg}</p>;
                })()}
              </div>

              {/* ── Expiry alert threshold ── */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11}/> Alert before expiry
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number" min="1" max="3650"
                    value={editingProduct.expiryAlertDays ?? 180}
                    onChange={e => setEditingProduct({ ...editingProduct, expiryAlertDays: e.target.value === "" ? "" : Number(e.target.value) })}
                    className={inp + " flex-1"}
                  />
                  <span className="text-xs text-gray-400 shrink-0">days before</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {(() => { const d = Number(editingProduct.expiryAlertDays) || 180; return `Alert in reports ${d} days before expiry${d >= 30 && d % 30 === 0 ? ` (${d / 30} months)` : ""}`; })()}
                </p>
              </div>

              {/* ── Barcode ── */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.barcode}</label>
                  <select
                    value={barcodeFormat}
                    onChange={e => setBarcodeFormat(e.target.value)}
                    className="text-[11px] px-2 py-0.5 rounded-lg
                      bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-white/10
                      text-gray-600 dark:text-gray-400 outline-none"
                  >
                    {BARCODE_FORMATS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input value={editingProduct.barcode}
                    onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className={inp + " flex-1"}/>
                  <button
                    onClick={() => {
                      const ts = Date.now().toString();
                      const code = barcodeFormat === "EAN13" ? ts.slice(-12).padStart(12, "0")
                        : barcodeFormat === "UPCA" ? ts.slice(-11).padStart(11, "0") : ts;
                      setEditingProduct({ ...editingProduct, barcode: code });
                    }}
                    className="px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 text-xs font-medium shrink-0">
                    <RefreshCw size={11}/> {t.generate}
                  </button>
                </div>
              </div>

              {/* ── Barcode preview ── */}
              <div className="rounded-xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/8 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-gray-400"/>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.preview}</span>
                  </div>
                  <button onClick={printLabel}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-medium transition">
                    <Printer size={11}/> {t.printLabel}
                  </button>
                </div>
                <svg ref={barcodeRef} className="w-full"/>
              </div>

              {/* ── Variants ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-gray-400"/>
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.variants}</span>
                  </div>
                  <button
                    onClick={addVariant}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                      bg-blue-600 hover:bg-blue-700 text-white transition font-medium"
                  >
                    <Plus size={11}/> {t.addVariant}
                  </button>
                </div>

                {(!editingProduct.variants || editingProduct.variants.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center py-2">
                    {t.noVariants}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editingProduct.variants.map((v, i) => (
                      <div key={i} className="rounded-xl bg-gray-50 dark:bg-[#1c1c1c] border border-gray-100 dark:border-white/8 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            placeholder={t.variantName}
                            value={v.name}
                            onChange={e => updateVariant(i, "name", e.target.value)}
                            className={inp + " flex-1 text-xs"}
                          />
                          <button
                            onClick={() => removeVariant(i)}
                            className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg
                              bg-red-100 dark:bg-red-900/30 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                          >
                            <Trash2 size={12}/>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-400 mb-1">{t.priceOptional}</p>
                            <input
                              type="number" min="0" step="0.01"
                              placeholder="Parent"
                              value={v.price ?? ""}
                              onChange={e => updateVariant(i, "price", e.target.value)}
                              className={inp + " text-xs"}
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 mb-1">{t.variantStock}</p>
                            <input
                              type="number" min="0"
                              value={v.stock}
                              onChange={e => updateVariant(i, "stock", e.target.value)}
                              className={inp + " text-xs"}
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 mb-1">{t.variantBarcode}</p>
                            <input
                              placeholder="Optional"
                              value={v.barcode || ""}
                              onChange={e => updateVariant(i, "barcode", e.target.value)}
                              className={inp + " text-xs"}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Sales stats ── */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} className="text-gray-400"/>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t.salesStatistics}</span>
                </div>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : stats ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-gray-400 font-medium">{t.allTime}</p>
                    <div className="flex gap-2">
                      <StatCard icon={ShoppingCart} label={t.unitsSold} value={stats.allTime.sold}
                        color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"/>
                      <StatCard icon={DollarSign} label={t.revenue} value={`$${stats.allTime.revenue.toFixed(2)}`}
                        color="bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"/>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-1">{t.last30Days}</p>
                    <div className="flex gap-2">
                      <StatCard icon={ShoppingCart} label={t.unitsSold} value={stats.last30.sold}
                        color="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"/>
                      <StatCard icon={DollarSign} label={t.revenue} value={`$${stats.last30.revenue.toFixed(2)}`}
                        color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"/>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-gray-400">{t.noSalesData}</div>
                )}
              </div>

            </div>

            {/* VAT Exempt + Online Store toggles */}
            <div className="px-5 pb-4 space-y-2">
              {/* VAT Exempt toggle */}
              <button
                onClick={() => setEditingProduct({ ...editingProduct, vatExempt: !editingProduct.vatExempt })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition
                  ${editingProduct.vatExempt
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                    : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-amber-300"
                  }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-base">🧾</span>
                  VAT Exempt
                  <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500">(e.g. basic food, medicine)</span>
                </div>
                <div className={`w-10 h-5 rounded-full transition-all relative ${editingProduct.vatExempt ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${editingProduct.vatExempt ? "left-5" : "left-0.5"}`}/>
                </div>
              </button>

              {/* Online Store toggle */}
              <button
                onClick={() => setEditingProduct({ ...editingProduct, isAvailableOnline: !editingProduct.isAvailableOnline })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition
                  ${editingProduct.isAvailableOnline
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                    : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-blue-300"
                  }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe size={15}/>
                  Show in Online Store
                </div>
                <div className={`w-10 h-5 rounded-full transition-all relative ${editingProduct.isAvailableOnline ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${editingProduct.isAvailableOnline ? "left-5" : "left-0.5"}`}/>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-white/8 flex gap-3 shrink-0 bg-gray-50 dark:bg-[#111]">
              <button onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-sm font-medium transition">
                {t.cancel}
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium transition flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  : <Save size={14}/>}
                {t.saveChanges}
              </button>
            </div>

          </motion.div>

          {/* Crop modal (above the drawer) */}
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
      )}
    </AnimatePresence>
  );
}
